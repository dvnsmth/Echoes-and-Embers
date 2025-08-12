import { DB } from './db.js';
import { Utils, calcMod, baseStats } from './utils.js';
import { State, Notifier } from './state.js';

export function createCharacter({name,race,clazz,bg,stats}){
  const cls = DB.classes[clazz];
  const rc = DB.races[race];
  const id = Utils.uid();
  const s = structuredClone(stats);
  if(rc.bonus){
    const b = rc.bonus;
    if(b.ANY){
      const key = DB.classes[clazz].primary || 'STR';
      s[key] += b.ANY;
    }
    for(const k of Object.keys(b)) if(k!=='ANY') s[k]+=b[k];
  }
  const level = 1, xp=0;
  const maxHP = cls.hp + calcMod(s.CON)*2 + 4;
  const ch = {
    id,name,race,clazz,bg: bg||"",
    stats:s,
    hp:maxHP, maxHP,
    xp, level,
    meta:{armor:10+calcMod(s.DEX), init:calcMod(s.DEX), lucky:0, openingStrike:0, xpMod:1, abilitiesUnlocked:[...cls.abilities.filter(a=>a.lvl===1).map(a=>a.name)]},
    equips:{weapon:{name:"Simple Weapon", dmg:[1,6], bonus:0}, armor:{name:"Cloth", ac:0}},
  };
  if(rc.onCreate) rc.onCreate(ch);
  return ch;
}

export function levelForXP(xp){
  for(let L=DB.xpCurve.length-1; L>=1; L--){ if(xp>=DB.xpCurve[L]) return L; }
  return 1;
}

export function grantXP(amount){
  const gain = Math.floor(amount);
  const msgs=[];
  State.party.forEach(ch=>{
    const m = Math.floor(gain*(ch.meta.xpMod||1));
    ch.xp += m;
    const newLevel = levelForXP(ch.xp);
    if(newLevel>ch.level){
      const diff = newLevel-ch.level;
      ch.level=newLevel;
      const cls = DB.classes[ch.clazz];
      const hpGain = diff*( (cls.hp/2)|0 + 2 + calcMod(ch.stats.CON) );
      ch.maxHP += Math.max(3,hpGain);
      ch.hp = ch.maxHP;
      const unlocked = cls.abilities.filter(a=>a.lvl<=newLevel && !ch.meta.abilitiesUnlocked.includes(a.name)).map(a=>a.name);
      ch.meta.abilitiesUnlocked.push(...unlocked);
      msgs.push(`${ch.name} reached level ${newLevel}!` + (unlocked.length?` New abilities: ${unlocked.join(', ')}.`:""));
    }
  });
  if(msgs.length) Notifier.toast(msgs.join("\n"));
  Notifier.refresh();
}

export function addItem(name, qty=1){
  State.inventory[name]=(State.inventory[name]||0)+qty;
  Notifier.toast(`+${qty} ${name}`);
  Notifier.refresh();
}

export function addGold(n){
  State.gold += n;
  Notifier.toast(`+${n} gold`);
  Notifier.refresh();
}

export { baseStats, calcMod };
