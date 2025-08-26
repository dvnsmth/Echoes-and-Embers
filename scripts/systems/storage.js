import { State, Notifier } from './state.js';
import { DB } from './db.js';
import { derivedFrom, AP_CARRY_CAP_DEFAULT } from './stats.js';

// Reattach methods & recompute derived stats for a loaded character
function rehydrateCharacter(ch) {
  // Defensive defaults
  ch.level   = Math.max(1, ch.level || 1);
  ch.xp      = ch.xp | 0;
  ch.unspent = (typeof ch.unspent === 'number') ? ch.unspent : 0;
  ch.stats   = ch.stats || { STR:12, DEX:12, CON:12, INT:12, WIS:12, LCK:12 };
  ch.equips  = ch.equips || {};
  ch.equips.weapon = ch.equips.weapon || { name:'Simple Weapon', dmg:[1,6], bonus:0 };
  ch.equips.armor  = ch.equips.armor  || { name:'Cloth', ac:0 };
  // Optional slots used by derivedFrom
  ch.equips.ward   = ch.equips.ward   || undefined;
  ch.equips.focus  = ch.equips.focus  || undefined;

  ch.meta = ch.meta || {};
  ch.temp = ch.temp || {};
  ch.apCarryCap = ch.apCarryCap ?? AP_CARRY_CAP_DEFAULT;
  ch.apCarry    = ch.apCarry    ?? 0;

  // Methods expected by the app (mirror character.js light versions)
  ch.allocate = ch.allocate || function(points){
    const spend = Object.values(points).reduce((a,b)=>a+(b|0),0);
    if (spend > this.unspent) return false;
    for (const k of Object.keys(points)) {
      const v = (this.stats[k] ?? 12) + (points[k] | 0);
      this.stats[k] = Math.max(10, Math.min(60, v));
    }
    this.unspent -= spend;
    this.meta.derived = null; // invalidate cache
    // Recompute below
    return true;
  };
  ch.getStats = ch.getStats || function(){ return { ...this.stats }; };

  ch.getDerived = ch.getDerived || function(){
    if (!this.meta) this.meta = {};
    if (!this.meta.derived) {
      const gear = {
        armor:  this.equips?.armor?.ac ?? 0,
        ward:   this.equips?.ward?.res ?? 0,
        weapon: this.equips?.weapon?.bonus ?? 0,
        focus:  this.equips?.focus?.bonus ?? 0,
        baseHP: (DB.classes[this.clazz]?.hpBase ?? DB.classes[this.clazz]?.hp ?? 100),
      };
      this.meta.derived = derivedFrom(this.stats, gear);
    }
    return this.meta.derived;
  };

  ch._damage = ch._damage || function(n){
    this.hp = Math.max(0, Math.min(this.maxHP, (this.hp|0) - (n|0)));
  };
  ch._heal = ch._heal || function(n){
    this.hp = Math.max(0, Math.min(this.maxHP, (this.hp|0) + (n|0)));
  };

  // Recompute derived & HP bounds on load
  ch.meta.derived = null;
  const d = ch.getDerived();
  ch.maxHP = d.HP | 0;
  // If HP was missing or > new max, clamp to max
  ch.hp = Math.min(ch.maxHP, Math.max(0, ch.hp | 0));
  if (!ch.hp) ch.hp = ch.maxHP; // healthy on migration
}

export const Storage = {
  save(){
    const data = { v: DB.version, state: State };
    localStorage.setItem('hollowvale-save', JSON.stringify(data));
    Notifier.toast('Game saved.');
  },
  load(){
    const raw = localStorage.getItem('hollowvale-save');
    if (!raw) { Notifier.toast('No save found.'); return false; }
    try{
      const obj = JSON.parse(raw);
      if (obj && obj.state) {
        Object.assign(State, obj.state);

        // --- MIGRATION / REHYDRATION ---
        if (!Array.isArray(State.party)) State.party = [];
        State.party.forEach(rehydrateCharacter);

        // Basic guards for new fields
        State.inventory = State.inventory || {};
        State.gold = State.gold | 0;

        Notifier.toast('Loaded.');
        Notifier.refresh();
        return true;
      }
    } catch(e){
      console.error(e);
      Notifier.toast('Load failed.');
    }
    return false;
  },
  hasSave(){ return !!localStorage.getItem('hollowvale-save'); }
};
