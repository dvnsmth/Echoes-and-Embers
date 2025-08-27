// scripts/systems/character.js
// Pure character logic (no DOM). Strict new model only.

import { races } from "../data/race.js";
import { classes } from "../data/class.js";
import {
  startingStats, applyAllocation, derivedFrom,
  LV_CAP, LEVEL1_ALLOC_POINTS, PER_LEVEL_POINTS
} from "../data/stats.js";
import { Utils, calcMod } from "./utils.js";
import { State, Notifier } from "./state.js";

const clampStat = v => Math.max(10, Math.min(60, v | 0));
const clampHP   = (hp, max) => Math.max(0, Math.min(max, hp | 0));

function getClassBaseHP(clazz) {
  const cls = classes[clazz] || {};
  return Number.isFinite(cls.hpBase) ? cls.hpBase
       : Number.isFinite(cls.hp)     ? cls.hp
       : 100;
}

function applyRaceBonuses(stats, raceKey, primaryKey = "STR") {
  const s  = structuredClone(stats);
  const rc = races[raceKey];
  if (!rc?.bonus) return s;
  const b = rc.bonus;
  if (b.ANY) {
    const key = primaryKey || "STR";
    s[key] = clampStat((s[key] ?? 12) + b.ANY);
  }
  for (const k of Object.keys(b)) {
    if (k === "ANY") continue;
    s[k] = clampStat((s[k] ?? 12) + b[k]);
  }
  return s;
}

function gearSnapshot(ch) {
  // Strict: expects `equipment` (IDs). Until a gear resolver is added,
  // derived stats are based on base class/race + zero equipment bonuses.
  return {
    armor:  0,
    ward:   0,
    weapon: 0,
    focus:  0,
    baseHP: getClassBaseHP(ch.clazz),
  };
}

function computeDerived(ch) { return derivedFrom(ch.stats, gearSnapshot(ch)); }

function refreshHPBounds(ch) {
  const d = computeDerived(ch);
  ch.maxHP = d.HP;
  if (!Number.isFinite(ch.hp)) ch.hp = ch.maxHP;
  ch.hp = clampHP(ch.hp, ch.maxHP);
  ch.meta.derived = d;
}

function ensureAbilityBucket(ch) {
  ch.meta = ch.meta || {};
  if (!Array.isArray(ch.meta.abilitiesUnlocked)) ch.meta.abilitiesUnlocked = [];
}

function unlockAbilitiesToLevel(ch, newLevel) {
  ensureAbilityBucket(ch);
  const cls = classes[ch.clazz] || { abilities: [] };
  const newly = (cls.abilities || [])
    .filter(a => (a.lvl ?? 1) <= newLevel && !ch.meta.abilitiesUnlocked.includes(a.name))
    .map(a => a.name);
  if (newly.length) ch.meta.abilitiesUnlocked.push(...newly);
  return newly;
}

export function createCharacter({ name, race, clazz, bg, stats }) {
  const id   = Utils.uid();
  const cls  = classes[clazz] || {};
  const prim = cls.primary || "STR";

  let base = startingStats();
  if (stats) for (const k of Object.keys(base)) if (k in stats) base[k] = clampStat(stats[k]);
  base = applyRaceBonuses(base, race, prim);

  const ch = {
    id, name, race, clazz, bg: bg || "",
    level: 1,
    xp: 0,
    unspent: LEVEL1_ALLOC_POINTS,
    stats: base,
    equipment: {}, // { weapon:id, armor:id, offhand:id, ... } — IDs only
    meta: {
      armor: 10 + calcMod(base.DEX),
      init: calcMod(base.DEX),
      lucky: 0,
      openingStrike: 0,
      xpMod: 1,
      abilitiesUnlocked: (cls.abilities || []).filter(a => (a.lvl ?? 1) === 1).map(a => a.name),
      derived: null,
    },
    hp: 0, maxHP: 0,
    temp: {},
    getDerived() { return this.meta?.derived || computeDerived(this); },
    allocate(points) {
      const spend = Object.values(points || {}).reduce((a,b)=>a + (b|0), 0);
      if (spend > this.unspent) return false;
      for (const k of Object.keys(points || {})) {
        this.stats[k] = clampStat((this.stats[k] ?? 12) + (points[k] | 0));
      }
      this.unspent -= spend;
      refreshHPBounds(this);
      return true;
    },
  };

  refreshHPBounds(ch);
  ch.hp = ch.maxHP;
  return ch;
}

function xpNeededFor(level) {
  if (level <= 1) return 0;
  const n = level;
  return 100 * n * (n - 1);
}

function applyXPToCharacter(ch, inc) {
  const add = Math.max(0, inc | 0);
  if (!add) return { gained: 0, levels: 0, newLevel: ch.level, abilitiesUnlocked: [] };

  ch.xp = (ch.xp | 0) + add;

  let levels = 0;
  const unlocked = [];
  while (ch.level < LV_CAP && ch.xp >= xpNeededFor(ch.level + 1)) {
    ch.level += 1;
    ch.unspent += PER_LEVEL_POINTS;
    const newly = unlockAbilitiesToLevel(ch, ch.level);
    if (newly.length) unlocked.push(...newly);
    refreshHPBounds(ch);
    levels++;
  }
  return { gained: add, levels, newLevel: ch.level, abilitiesUnlocked: unlocked };
}

export function grantXPTo(ch, amount) { return applyXPToCharacter(ch, amount); }
export function grantXP(amount, { split = true } = {}) {
  const p = State.party || [];
  if (!p.length) return [];
  const each = split ? Math.floor(Number(amount || 0) / p.length) : Number(amount || 0);
  const results = p.map(c => applyXPToCharacter(c, each));
  Notifier.refresh?.();
  return results;
}

export default { createCharacter, grantXP, grantXPTo };
