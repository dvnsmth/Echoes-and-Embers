// encounters.js — encounter builder for Stonefall
// Direct import style (no aggregator needed)
import { ENEMIES, ENEMY_LIST, enemiesFor, TIER, tiersForPartyLevel } from "./enemies.js";

// ---- Difficulty model ----
export const DIFFICULTY = {
  EASY: "easy",
  STANDARD: "standard",
  HARD: "hard",
  DEADLY: "deadly",
};

const DIFF_BUDGET_PER_MEMBER = {
  [DIFFICULTY.EASY]: 2,
  [DIFFICULTY.STANDARD]: 3,
  [DIFFICULTY.HARD]: 4,
  [DIFFICULTY.DEADLY]: 6,
};

// Tier base weights (how many “points” each unit roughly costs)
const TIER_WEIGHT = {
  [TIER.NORMAL]: 1,
  [TIER.ELITE]: 2,
  [TIER.CHAMPION]: 4,
  [TIER.BOSS]: 8,
  [TIER.MYTHIC]: 12,
};

// ---- Threat / budget helpers ----
export function budgetFor(partySize = 3, difficulty = DIFFICULTY.STANDARD) {
  const per = DIFF_BUDGET_PER_MEMBER[difficulty] ?? DIFF_BUDGET_PER_MEMBER[DIFFICULTY.STANDARD];
  return Math.max(1, Math.round(per * partySize));
}

/**
 * Threat value of an enemy for a given party level.
 * - Base from tier.
 * - ±25% per level delta vs party level (floored to 0.5 so trash never becomes 0).
 */
export function threatFor(enemy, partyLevel = 1) {
  const base = TIER_WEIGHT[enemy.tier] ?? 1;
  const delta = (enemy.level ?? partyLevel) - partyLevel;
  const mult = 1 + 0.25 * delta; // 25% per level step
  return Math.max(0.5, round2(base * mult));
}

// ---- RNG (supports deterministic seeds) ----
function xmur3(str) { // tiny seeded hash
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353), h = (h << 13) | (h >>> 19);
  return function() { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function mulberry32(a) { return function() { let t = (a += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeRNG(seed) { if (seed == null) return Math.random; const h = xmur3(String(seed))(); return mulberry32(h); }
function pick(arr, rnd = Math.random) { return arr[Math.floor(rnd() * arr.length)]; }

// ---- Core builder ----
/**
 * Roll an encounter: returns an array of enemy *definitions* (not instances).
 * Use instantiateEncounter() to get combat-ready copies with hpCurrent, ids, etc.
 */
export function rollEncounter({
  partyLevel = 1,
  partySize = 3,
  difficulty = DIFFICULTY.STANDARD,
  biomes = null,            // e.g., ["forest","caves"]
  families = null,          // e.g., ["Undead","Beast"]
  tiers = null,             // override allowed tiers
  seed = null,
  maxEnemies = 5,
  allowBossesBelowHard = false, // keep bosses out of easy/standard by default
} = {}) {
  const rnd = makeRNG(seed);
  const budget = budgetFor(partySize, difficulty);

  // Allowed tiers by party level + difficulty
  let allowed = tiers || tiersForPartyLevel(partyLevel);
  const isEasyOrStandard = (difficulty === DIFFICULTY.EASY || difficulty === DIFFICULTY.STANDARD);
  if (isEasyOrStandard && !allowBossesBelowHard) {
    allowed = allowed.filter(t => t !== TIER.BOSS && t !== TIER.MYTHIC);
  }

  // Candidate pool
  const pool = enemiesFor({ partyLevel, biomes, families, tiers: allowed });
  if (!pool.length) return [];

  // Sort by ascending threat so we can greedily pack
  const withThreat = pool.map(e => ({ e, t: threatFor(e, partyLevel) }))
                         .sort((a, b) => a.t - b.t);

  let remaining = budget;
  const picked = [];

  // Greedy + random fill
  while (picked.length < maxEnemies) {
    // Allow slightly oversized picks if we are empty (so we can always return at least one)
    const tolerance = picked.length === 0 ? 1.25 : 1.05;
    const candidates = withThreat.filter(x => x.t <= remaining * tolerance);

    if (!candidates.length) break;

    // Bias toward cheaper enemies so we don't blow the budget too fast
    // Weight = 1 / threat
    const totalW = candidates.reduce((a, c) => a + (1 / c.t), 0);
    let r = rnd() * totalW;
    let chosen = candidates[0];
    for (const c of candidates) {
      r -= (1 / c.t);
      if (r <= 0) { chosen = c; break; }
    }

    picked.push(chosen.e);
    remaining = Math.max(0, remaining - chosen.t);
    // Small chance to stop early even if budget remains (natural variety)
    if (remaining < 1 || rnd() < 0.12) break;
  }

  // If nothing was picked (e.g., budget tiny vs pool), pick the cheapest
  if (picked.length === 0) picked.push(withThreat[0].e);

  // Optional: at most one boss unless deadly
  if (difficulty !== DIFFICULTY.DEADLY) {
    const bosses = picked.filter(e => e.tier >= TIER.BOSS);
    if (bosses.length > 1) {
      // Keep strongest boss, downgrade others to elites (cheapest elite from pool)
      const strongest = bosses.reduce((a, b) => (a.level >= b.level ? a : b));
      const cheapestElite = withThreat.find(x => x.e.tier === TIER.ELITE)?.e;
      const filtered = picked.filter(e => e === strongest || e.tier < TIER.BOSS);
      if (cheapestElite) filtered.push(cheapestElite);
      return filtered;
    }
  }

  return picked;
}

// Create combat-ready instances (deep-ish copies with ids and hpCurrent)
export function instantiateEncounter(enemyDefs = []) {
  return enemyDefs.map((def, idx) => ({
    id: `foe_${slug(def.key)}_${Date.now().toString(36)}_${idx}`,
    key: def.key,
    family: def.family,
    tier: def.tier,
    level: def.level,
    ai: def.ai,
    emoji: def.emoji,
    // runtime stats
    hpMax: def.hp,
    hpCurrent: def.hp,
    atk: def.atk,
    def: def.def,
    dmg: Array.isArray(def.dmg) ? [...def.dmg] : [1, 4],
    moves: (def.moves || []).map(m => ({ ...m })), // shallow copy okay for data
    // status/cd slots for your combat loop
    status: [],
    cooldowns: {},
    // convenience: show name in logs
    name: def.key,
  }));
}

// Collapse for UI: [{key, count, tier, level, emoji}]
export function collapseEncounter(enemyDefs = []) {
  const map = new Map();
  for (const e of enemyDefs) {
    const k = e.key;
    if (!map.has(k)) map.set(k, { key: k, count: 0, tier: e.tier, level: e.level, emoji: e.emoji });
    map.get(k).count++;
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

// Rough XP reward from threat (tuned later against your XP_CURVE)
export function xpForEncounter(enemyDefs = [], partyLevel = 1) {
  const perEnemy = (e) => Math.round(12 * threatFor(e, partyLevel));
  return enemyDefs.reduce((acc, e) => acc + perEnemy(e), 0);
}

// ---- Utils ----
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
function round2(n) { return Math.round(n * 100) / 100; }
