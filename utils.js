export const Utils = {
  rand:(a,b)=>Math.floor(Math.random()*(b-a+1))+a,
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  roll:(sides)=>Math.floor(Math.random()*sides)+1,
  uid:()=>Math.random().toString(36).slice(2,9),
  choice:(arr)=>arr[Math.floor(Math.random()*arr.length)]
};

export function baseStats(){return {STR:8,DEX:8,CON:8,INT:8,WIS:8,CHA:8}}
export function calcMod(score){return Math.floor((score-10)/2)}
