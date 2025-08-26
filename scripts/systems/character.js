// character.js
import { DB } from '../../db.js';
import { Utils, calcMod, baseStats } from './utils.js';
import { State, Notifier } from './state.js';

// === New stat/ATB model hooks ===
import {
  startingStats,
  applyAllocation,
  derivedFrom,
  LV_CAP,
  LEVEL1_ALLOC_POINTS,
  PER_LEVEL_POINTS,
} from '../data/stats.js';

// -------------------------------
// Helpers
// -------------------------------
const clampStat = (v) => Math.max(10, Math.min(60, v|0));
const clampHP = (hp, max) => Math.max(0, Math.min(max, hp|0));

function getClassBaseHP(clazz) {
  const cls = DB.classes[clazz] || {};
  // Prefer an explicit base HP field, fall back to older 'hp' if present, else 100
  return Number.isFinite(cls.hpBase) ? cls.hpBase
       : Number.isFinite(cls.hp)     ? cls.hp
       : 100;
}

function applyRaceBonuses(stats, race, primaryKey) {
  const s = structuredClone(stats);
  const rc = DB.races[race];
  if (!rc || !rc.bonus) return s;

  const b = rc.bonus;
  if (b.ANY) {
    const key = primaryKey || 'STR';
    s[key] = clampStat((s[key] ?? 12) + b.ANY);
  }
  for (const k of Object.keys(b)) {
    if (k === 'ANY') continue;
    s[k] = clampStat((s[k] ?? 12) + b[k]);
  }
  return s;
}

function computeDerived(ch) {
  // Feed the gear + class base HP into derived math
  const gear = {
    armor: ch.equips?.armor?.ac ?? 0,
    ward:  ch.equips?.ward?.res ?? 0,
    weapon: ch.equips?.weapon?.bonus ?? 0,
    focus:  ch.equips?.focus?.bonus ?? 0,
    baseHP: getClassBaseHP(ch.clazz),
  };
  return derivedFrom(ch.stats, gear);
}

function refreshHPBounds(ch) {
  const d = computeDerived(ch);
  ch.maxHP = d.HP;
  ch.hp = clampHP(ch.hp, ch.maxHP);
  ch.meta.derived = d; // cache for UI
}

function unlockAbilitiesToLevel(ch, newLevel) {
  const cls = DB.classes[ch.clazz] || { abilities: [] };
  const newly = (cls.abilities || [])
    .filter(a => a.lvl <= newLevel && !ch.meta.abilitiesUnlocked.includes(a.name))
    .map(a => a.name);
  if (newly.length) ch.meta.abilitiesUnlocked.push(...newly);
  return newly;
}

// -------------------------------
// Character creation
// -------------------------------
export function createCharacter({ name, race, clazz, bg, stats }) {
  const id = Utils.uid();
  const cls = DB.classes[clazz] || {};
  const primary = cls.primary || 'STR';

  // Start from new model defaults (12s), then apply any provided 'stats' overrides, then race bonuses
  let base = startingStats();
  if (stats) {
    for (const k of Object.keys(base)) {
      if (k in stats) base[k] = clampStat(stats[k]);
    }
  }
  base = applyRaceBonuses(base, race, primary);

  const ch = {
    id, name, race, clazz, bg: bg || "",
    level: 1,
    xp: 0,
    // Player allocation pool: 14 on level 1 for immediate customization
    unspent: LEVEL1_ALLOC_POINTS,

    // Base six stats (10–60 band). Player will allocate per level (+4 default).
    stats: base,

    // Equipment (kept simple; integrate with your DB as needed)
    equips: {
      weapon: { name: "Simple Weapon", dmg: [1, 6], bonus: 0 },
      armor:  { name: "Cloth", ac: 0 },
      // optional slots:
      // ward:   { name: "Charm", res: 0 },
      // focus:  { name: "Focus", bonus: 0 },
    },

    // Meta & cached derived values for UI
    meta: {
      // Legacy/meta fields preserved if other parts of your code use them:
      armor: 10 + calcMod(base.DEX),
      init: calcMod(base.DEX),
      lucky: 0, openingStrike: 0,
      xpMod: 1,

      // Abilities available at level 1
      abilitiesUnlocked: (cls.abilities || []).filter(a => a.lvl === 1).map(a => a.name),
      // abilities at level 1 (flat array, not nested)
      meta: {
      armor: 10 + calcMod(base.DEX),
      init: calcMod(base.DEX),
      lucky: 0, openingStrike: 0,
      xpMod: 1,
      abilitiesUnlocked: (cls.abilities || [])
      .filter(a => a.lvl === 1)
      .map(a => a.name),
      derived: null,
      },




      // cache of derived numbers (HP/PAtk/MAtk/DEF/RES/crit/atbSec)
      derived: null,
    },

    // Runtime combat state
    hp: 0,
    maxHP: 0,

    // Temporary battle buffs/debuffs bag (optional)
    temp: {},

    // Methods (attached to plain object for convenience)
    allocate(points) {
      // points: { STR:+x, DEX:+y, ... }
      // Spend from unspent; clamp stats
      const spend = Object.values(points).reduce((a,b)=>a + (b|0), 0);
      if (spend > this.unspent) return false;

      const next = structuredClone(this.stats);
      for (const k of Object.keys(points)) {
        next[k] = clampStat((next[k] ?? 12) + (points[k] | 0));
      }
      this.stats = applyAllocation(this.stats, points); // respects clamp internally too
      this.unspent -= spend;
      refreshHPBounds(this); // <-- pass the character
      if (typeof refreshHPBounds === 'function') refreshHPBounds(this);
    },
  };
  refreshHPBounds(ch);      // compute derived from base stats/gear/class
  ch.hp = ch.maxHP;         // start healthy at creation
  return ch;
}
// --- XP progression (temporary placeholder curve) ---
// Returns the cumulative XP required to REACH the given level (lvl 1 -> 0 XP).
function xpNeededFor(level) {
  if (level <= 1) return 0;
  // Simple quadratic curve; replace with your data table later if desired.
  // Example: 100 * n * (n - 1), where n = level
  const n = level;
  return 100 * n * (n - 1);
}

// --- Named export expected by combat.js ---
export function grantXP(ch, amount) {
  const inc = Math.max(0, amount | 0);
  if (!inc) {
    return { gained: 0, levels: 0, newLevel: ch.level, abilitiesUnlocked: [] };
  }

  // Add XP
  ch.xp = (ch.xp | 0) + inc;

  // Level-up loop (respects LV_CAP)
  let levels = 0;
  const unlocked = [];
  while (ch.level < LV_CAP && ch.xp >= xpNeededFor(ch.level + 1)) {
    ch.level += 1;
    ch.unspent += PER_LEVEL_POINTS;

    // Unlock any class abilities up to this new level
    const newly = unlockAbilitiesToLevel(ch, ch.level) || [];
    if (newly.length) unlocked.push(...newly);

    // Refresh derived stats & clamp HP to new max
    refreshHPBounds(ch);

    levels += 1;
  }

  // Return a compact result for UI/logging
  return { gained: inc, levels, newLevel: ch.level, abilitiesUnlocked: unlocked };
}
