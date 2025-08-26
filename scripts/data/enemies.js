// scripts/data/enemies.js
// Data-only. Enemies now include 1–60 stats (STR, DEX, CON, INT, WIS, LCK)
// while preserving hp/atk/def/dmg for the current combat implementation.

export const TIER = { NORMAL:1, ELITE:2, CHAMPION:3, BOSS:4, MYTHIC:5 };

// --- stat templating ---------------------------------------------------------
// Deterministic, readable stat blocks derived from level, tier, and family bias.
function clamp10_60(n){ return Math.max(10, Math.min(60, Math.round(n))); }
const FAMILY_WEIGHTS = {
  Beast:      { STR:1.15, DEX:1.20, CON:1.05, INT:0.80, WIS:0.85, LCK:1.00 },
  Goblinoid:  { STR:1.00, DEX:1.15, CON:0.95, INT:0.95, WIS:0.90, LCK:1.05 },
  Humanoid:   { STR:1.00, DEX:1.00, CON:1.00, INT:1.00, WIS:1.00, LCK:1.00 },
  Undead:     { STR:0.95, DEX:0.85, CON:1.25, INT:0.90, WIS:1.10, LCK:0.85 },
  Elemental:  { STR:1.05, DEX:0.95, CON:1.15, INT:1.00, WIS:1.00, LCK:0.90 },
  Dragon:     { STR:1.30, DEX:1.00, CON:1.25, INT:1.10, WIS:1.05, LCK:1.00 },
  Giant:      { STR:1.30, DEX:0.85, CON:1.25, INT:0.95, WIS:0.95, LCK:0.90 },
  Plant:      { STR:1.05, DEX:0.85, CON:1.25, INT:0.90, WIS:1.00, LCK:0.90 },
  Aberration: { STR:1.05, DEX:0.95, CON:1.05, INT:1.15, WIS:1.10, LCK:0.95 },
  Fiend:      { STR:1.15, DEX:1.05, CON:1.00, INT:1.05, WIS:0.95, LCK:1.00 },
  Spirit:     { STR:0.90, DEX:1.10, CON:0.90, INT:1.15, WIS:1.20, LCK:1.00 },
  Construct:  { STR:1.15, DEX:0.85, CON:1.25, INT:0.80, WIS:0.85, LCK:0.80 },
  Ooze:       { STR:0.95, DEX:0.80, CON:1.20, INT:0.80, WIS:0.85, LCK:0.90 },
  Orc:        { STR:1.20, DEX:1.00, CON:1.05, INT:0.85, WIS:0.85, LCK:0.95 },
  SpiritDefault: { STR:1, DEX:1, CON:1, INT:1, WIS:1, LCK:1 },
};

// baseline growth: start at 10 and scale with level & tier
function statTemplate({ level=1, tier=TIER.NORMAL, family="Humanoid" }){
  const w = FAMILY_WEIGHTS[family] || FAMILY_WEIGHTS.Humanoid;
  const tierBoost = (tier-1) * 1.5;  // slight tier emphasis
  const lv = Math.max(1, level);

  const base = 10;
  const grow = (bias) => clamp10_60(base + (lv * 2.0 + tierBoost) * bias);

  return {
    STR: grow(w.STR),
    DEX: grow(w.DEX),
    CON: grow(w.CON),
    INT: grow(w.INT),
    WIS: grow(w.WIS),
    LCK: grow(w.LCK),
  };
}

function withStats(def){
  if (def.stats) return def;
  return { ...def, stats: statTemplate({ level: def.level, tier: def.tier, family: def.family }) };
}

// --- RAW ENEMIES (hp/atk/def/dmg etc.) --------------------------------------
// (same shapes you already had; shortened excerpt shown here)
const ENEMIES_RAW = {
  "Awakened Tree": {
    key: "Awakened Tree", family: "Plant", tier: TIER.CHAMPION, level: 6,
    hp: 25, atk: 7, def: 16, dmg: [3,10], ai: "random", emoji: "🌳 awakened tree",
    moves: [{ key: "slam", name: "Slam", type: "bludgeoning", dmg: [3,10] }],
    tags: ["forest"]
  },
  "Bandit": {
    key: "Bandit", family: "Humanoid", tier: TIER.NORMAL, level: 2,
    hp: 12, atk: 4, def: 12, dmg: [1,6], ai: "random", emoji: "🏴‍☠️ bandit",
    moves: [{ key: "slash", name: "Slash", type: "slashing", dmg: [1,6] }],
    tags: ["road","camp"]
  },
  // ... keep the rest of your entries exactly as before ...
  "Wraith": {
    key: "Wraith", family: "Undead", tier: TIER.CHAMPION, level: 7,
    hp: 18, atk: 7, def: 16, dmg: [3,9], ai: "random", emoji: "👻 wraith",
    moves: [{ key: "life_drain", name: "Life Drain", type: "necrotic", dmg: [3,9] }],
    tags: ["ruin","night"]
  }
};

// Auto-attach stat blocks to every enemy
export const ENEMIES = Object.fromEntries(
  Object.entries(ENEMIES_RAW).map(([k, v]) => [k, withStats(v)])
);

// Handy lists & filters (unchanged)
export const ENEMY_LIST = Object.values(ENEMIES).sort((a,b)=>a.key.localeCompare(b.key));

export function tiersForPartyLevel(level = 1) {
  if (level <= 2) return [TIER.NORMAL];
  if (level <= 4) return [TIER.NORMAL, TIER.ELITE];
  if (level <= 6) return [TIER.ELITE, TIER.CHAMPION];
  if (level <= 8) return [TIER.CHAMPION, TIER.BOSS];
  return [TIER.BOSS, TIER.MYTHIC];
}

export function enemiesFor({ partyLevel = 1, biomes = null, families = null, tiers = null } = {}) {
  const allowed = tiers || tiersForPartyLevel(partyLevel);
  return ENEMY_LIST.filter(e =>
    allowed.includes(e.tier) &&
    (biomes ? biomes.some(b => e.tags?.includes(b)) : true) &&
    (families ? families.includes(e.family) : true)
  );
}

// XP curve still here for convenience
export const XP_CURVE = [0, 50, 125, 225, 350, 500, 700, 950, 1250, 1600, 2000];

export default ENEMIES;
