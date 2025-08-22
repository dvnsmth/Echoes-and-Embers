export const Utils = {
  rand:(a,b)=>Math.floor(Math.random()*(b-a+1))+a,
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  roll:(sides)=>Math.floor(Math.random()*sides)+1,
  uid:()=>Math.random().toString(36).slice(2,9),
  choice:(arr)=>arr[Math.floor(Math.random()*arr.length)]
};

// For backward compatibility some modules may still import these.
// Align with the new system: Lv1 starts at 12 (10–60 band).
export function baseStats(){ return { STR:12, DEX:12, CON:12, INT:12, WIS:12, LCK:12 }; }

// Kept for legacy formulas (e.g., UI display); not used by the new combat math.
export function calcMod(score){ return Math.floor((score-12)/2); }
