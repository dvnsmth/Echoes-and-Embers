// spawnTables.js — handcrafted “recipes” (minions + elite + optional captain)
// Budget-aware and seedable. Returns ENEMY DEFINITIONS (not instances).
import { ENEMIES, enemiesFor, TIER } from "./enemies.js";
import { budgetFor, threatFor, DIFFICULTY } from "./encounters.js";

// Tiny RNG (deterministic if seed provided)
function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),3432918353),h=(h<<13)|(h>>>19);return function(){h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return (h^=h>>>16)>>>0;};}
function mulberry32(a){return function(){let t=(a+=0x6D2B79F5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function makeRNG(seed){ if(seed==null) return Math.random; const h=xmur3(String(seed))(); return mulberry32(h); }
function randInt(rnd,min,max){ return Math.floor(rnd()*(max-min+1))+min; }
function pick(rnd, arr){ return arr[Math.floor(rnd()*arr.length)]; }

// Utility: pull by name safely
const byName = (name) => ENEMIES[name];

// ---------- TABLE DEFINITIONS ----------
// Each table describes slots; the builder fills slots under a difficulty budget.
// Slot shapes:
//   { role: "minion"|"elite"|"captain"|"boss"|"pack",
//     count: [min,max],
//     tiers: [TIER.*],        // optional: restrict tiers
//     families: ["Beast"],    // optional
//     biomes: ["forest"],     // optional
//     names: ["Goblin"],      // optional: explicit list to choose from
//     requireAtLeast: 0|1,    // optional: if no candidate exists, ignore vs. fallback
//   }

export const SPAWN_TABLES = {
  // Low-level forest road: wolves/goblins + chance of captain OR wolf pack
  forest_road_t1: {
    key: "forest_road_t1",
    name: "Forest Road (T1 Recipe)",
    slots: [
      { role: "minion", count: [2, 4], tiers: [TIER.NORMAL], families: ["Beast","Goblinoid"], biomes: ["forest","road"] },
      { role: "pack",   count: [0, 1], names: ["Wolf Pack"], tiers: [TIER.ELITE], requireAtLeast: 0 },
      { role: "elite",  count: [0, 1], tiers: [TIER.ELITE], families: ["Goblinoid"], names: ["Hobgoblin","Goblin Captain"], requireAtLeast: 0 },
    ],
  },

  // Caves T2: spiders/slimes/gnolls; chance of Giant Spider
  caves_t2: {
    key: "caves_t2",
    name: "Caves (T2 Recipe)",
    slots: [
      { role: "minion", count: [2, 3], tiers: [TIER.NORMAL], biomes: ["caves"], families: ["Ooze","Humanoid","Beast"] },
      { role: "elite",  count: [1, 2], tiers: [TIER.ELITE], biomes: ["caves"], families: ["Goblinoid","Beast"] },
      { role: "captain",count: [0, 1], names: ["Giant Spider","Mimic"], tiers: [TIER.CHAMPION], requireAtLeast: 0 },
    ],
  },

  // Crypt T2: skeletons + specter/wraith; chance of banshee
  crypt_undead_t2: {
    key: "crypt_undead_t2",
    name: "Crypt (Undead T2 Recipe)",
    slots: [
      { role: "minion", count: [2, 4], tiers: [TIER.NORMAL], families: ["Undead"], biomes: ["crypt","ruin"], names: ["Skeleton"] },
      { role: "elite",  count: [0, 2], tiers: [TIER.CHAMPION], families: ["Undead"], names: ["Specter","Wraith"] },
      { role: "captain",count: [0, 1], tiers: [TIER.ELITE], families: ["Undead"], names: ["Banshee"], requireAtLeast: 0 },
    ],
  },

  // Tundra patrol: beasts/elementals + chance of Ice Drake
  tundra_elites_t3: {
    key: "tundra_elites_t3",
    name: "Tundra Patrol (T3 Recipe)",
    slots: [
      { role: "minion", count: [1, 2], tiers: [TIER.ELITE], families: ["Beast","Construct"], biomes: ["tundra"] },
      { role: "elite",  count: [1, 2], tiers: [TIER.CHAMPION], families: ["Elemental","Beast"], names: ["Shambling Mound","Treant","Snow Golem","Ice Elemental"] },
      { role: "captain",count: [0, 1], tiers: [TIER.CHAMPION], families: ["Dragon"], names: ["Ice Drake"], requireAtLeast: 0 },
    ],
  },

  // Boss lair: one boss + 0–2 adds. (You still need to gate by level in UI.)
  boss_lair_dragon: {
    key: "boss_lair_dragon",
    name: "Boss Lair: Dragon",
    slots: [
      { role: "boss",   count: [1, 1], names: ["White Dragon","Black Dragon"], tiers: [TIER.BOSS] },
      { role: "elite",  count: [0, 2], tiers: [TIER.CHAMPION], families: ["Beast","Elemental","Construct"], biomes: ["tundra","swamp","sky"] },
    ],
  },
};

// ---------- CORE BUILDER ----------
export function buildEncounterFromTable(tableKey, {
  partyLevel = 1,
  partySize = 3,
  difficulty = DIFFICULTY.STANDARD,
  seed = null,
  maxEnemies = 6,
} = {}) {
  const table = SPAWN_TABLES[tableKey];
  if (!table) throw new Error(`[spawnTables] Unknown table: ${tableKey}`);

  const rnd = makeRNG(seed);
  const budget = budgetFor(partySize, difficulty);
  const picked = [];
  let used = 0;

  // Helper: add a definition if it fits (or if we're empty, allow slight overshoot)
  const tryAdd = (def) => {
    if (!def) return false;
    const t = threatFor(def, partyLevel);
    const canFit = (used + t <= budget) || picked.length === 0; // always allow at least one
    if (!canFit) return false;
    picked.push(def);
    used += t;
    return true;
  };

  for (const slot of table.slots) {
    const want = randInt(rnd, slot.count[0], slot.count[1]);
    if (want <= 0) continue;

    // Candidate pool for this slot
    let pool = [];
    if (slot.names?.length) {
      pool = slot.names.map(byName).filter(Boolean);
    } else {
      pool = enemiesFor({
        partyLevel,
        biomes: slot.biomes ?? null,
        families: slot.families ?? null,
        tiers: slot.tiers ?? null,
      });
    }

    // Sort by ascending threat so we can try cheaper first if budget is tight
    const sorted = pool
      .map(e => ({ e, t: threatFor(e, partyLevel) }))
      .sort((a, b) => a.t - b.t)
      .map(x => x.e);

    if (!sorted.length) {
      if (slot.requireAtLeast) {
        // Fallback: pick any NORMAL-tier thing globally so the recipe never collapses
        const global = enemiesFor({ partyLevel, tiers: [TIER.NORMAL] });
        if (global.length) tryAdd(pick(rnd, global));
      }
      continue;
    }

    // Try to add up to 'want'
    for (let i = 0; i < want && picked.length < maxEnemies; i++) {
      // Prefer something that fits; bias to cheaper entries if we're near budget
      let candidate = null;

      // 70%: pick from the cheaper half, 30%: any
      const half = Math.max(1, Math.floor(sorted.length / 2));
      const cheaper = sorted.slice(0, half);
      const bucket = (rnd() < 0.7 ? cheaper : sorted);

      // Try a few attempts to find something that fits
      for (let tries = 0; tries < 5; tries++) {
        const e = pick(rnd, bucket);
        const t = threatFor(e, partyLevel);
        if (used + t <= budget || picked.length === 0) { candidate = e; break; }
      }

      // If still nothing, break this slot
      if (!candidate) break;

      tryAdd(candidate);
    }
  }

  // Clamp total count
  while (picked.length > maxEnemies) picked.pop();

  // If nothing selected for some reason, guarantee at least one NORMAL
  if (!picked.length) {
    const fallback = enemiesFor({ partyLevel, tiers: [TIER.NORMAL] });
    if (fallback.length) picked.push(pick(makeRNG(seed), fallback));
  }

  return picked;
}

export function listSpawnTables() {
  return Object.values(SPAWN_TABLES).map(t => ({ key: t.key, name: t.name }));
}

export default SPAWN_TABLES;
