import { AudioManager } from './audio.js';
import { State, Notifier } from './state.js';
import { calcMod } from './character.js';

export const Sheet = {
  useTonic(id){
    if(!State.inventory['Minor Tonic']) return Notifier.toast('No Minor Tonic.');
    const ch = State.party.find(c=>c.id===id); if(!ch) return;
    const heal = 6; ch.hp = Math.min(ch.maxHP, ch.hp+heal);
    State.inventory['Minor Tonic']--;
    if(State.inventory['Minor Tonic']<=0) delete State.inventory['Minor Tonic'];
    Notifier.toast(`${ch.name} drinks a tonic (+${heal} HP).`); Notifier.refresh();
  },
  equip(id){
    const ch = State.party.find(c=>c.id===id); if(!ch) return;
    ch.equips.weapon = {name:"Steel Blade", dmg:[1,8], bonus:1};
    ch.equips.armor = {name:"Leather", ac:1};
    ch.meta.armor = 10 + calcMod(ch.stats.DEX) + 1;
    try{ AudioManager.play('select'); }catch{}
    Notifier.toast(`${ch.name} equips better gear.`); Notifier.refresh();
  }
};