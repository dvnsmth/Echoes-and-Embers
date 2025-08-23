// stats.js
export const BASE_ATB_TIME = 3.0;          // global feel; you can tune 2.8–3.2
export const ATB_MIN_TIME  = 2.0;          // hard floor
export const BASE_AP_PER_TURN = 3;
export const AP_CARRY_CAP_DEFAULT = 2;

// Compressed multi-impact stats on a 10–60 scale
// STR, DEX, CON, INT, WIS, LCK

export function atbTime(DEX) {
  const t = BASE_ATB_TIME * (100 / (80 + DEX)); // 2–4s window centered ~3.0s
  return Math.max(ATB_MIN_TIME, Number(t.toFixed(2)));
}

export function derivedFrom(stats, gear = {}) {
  const { STR, DEX, CON, INT, WIS, LCK } = stats;

  const armor   = gear.armor   ?? 0;
  const ward    = gear.ward    ?? 0;
  const weapon  = gear.weapon  ?? 0;
  const focus   = gear.focus   ?? 0;
  const baseHP  = gear.baseHP  ?? 100; // class base overrides this
  const block   = gear.block   ?? 0;

  // Derived values per your model
  const HP   = baseHP + (CON * 6) + (STR * 2);
  const PAtk = weapon + (STR * 2);
  const MAtk = focus  + (INT * 2);

  const DEF  = armor + (CON * 0.5) + (DEX * 0.3) + (block || 0);
  const RES  = ward  + (WIS * 0.5) + (CON * 0.3);

  // crit and status
  let critPct = (DEX * 0.3) + (LCK * 0.4);
  critPct = Math.min(40, Number(critPct.toFixed(1)));

  const statusApplyScalar = 1 + (INT / 100) + (WIS / 150);
  const statusResistPct   = Math.min(60, Number((LCK * 0.4).toFixed(1)));

  return {
    HP: Math.floor(HP),
    PAtk: Math.floor(PAtk),
    MAtk: Math.floor(MAtk),
    DEF: Number(DEF.toFixed(1)),
    RES: Number(RES.toFixed(1)),
    critPct,
    statusApplyScalar: Number(statusApplyScalar.toFixed(2)),
    statusResistPct,
    atbSec: atbTime(DEX),
  };
}

// Damage helpers (±5% variance)
export function physicalDamage(attacker, defender, skillPower = 1.0) {
  const raw = (attacker.PAtk * skillPower) - defender.DEF;
  return Math.max(1, Math.floor(raw * (0.95 + Math.random() * 0.10)));
}
export function magicalDamage(attacker, defender, skillPower = 1.0) {
  const raw = (attacker.MAtk * skillPower) - defender.RES;
  return Math.max(1, Math.floor(raw * (0.95 + Math.random() * 0.10)));
}

// Allocation + leveling
export const LV_CAP = 40;
export const LEVEL1_ALLOC_POINTS = 14; // at level 1
export const PER_LEVEL_POINTS     = 4; // levels 2..40

export function startingStats() {
  // floor 10 in all stats
  return { STR:10, DEX:10, CON:10, INT:10, WIS:10, LCK:10 };
}

export function applyAllocation(stats, alloc) {
  const out = { ...stats };
  for (const k of Object.keys(alloc)) {
    out[k] = Math.max(10, Math.min(60, out[k] + (alloc[k] | 0)));
  }
  return out;
}
