// scripts/systems/storage.js
// Save/load for the strict model. No legacy migrations, no DB usage.

import { State, Notifier } from "systems/state.js";
import { derivedFrom } from "data/stats.js";
import { classes } from "data/class.js";

const SAVE_KEY = "hollowvale-save";

// --- helpers ---
function baseHPFor(clazz) {
  const cls = classes[clazz] || {};
  return Number.isFinite(cls.hpBase) ? cls.hpBase
       : Number.isFinite(cls.hp)     ? cls.hp
       : 100;
}

function reattachCharacterRuntime(ch) {
  // minimal runtime methods expected by the app
  ch.getDerived = ch.getDerived || function () {
    if (!this.meta) this.meta = {};
    if (!this.meta.derived) {
      const gear = { armor: 0, ward: 0, weapon: 0, focus: 0, baseHP: baseHPFor(this.clazz) };
      this.meta.derived = derivedFrom(this.stats, gear);
    }
    return this.meta.derived;
  };

  ch.allocate = ch.allocate || function (points) {
    const spend = Object.values(points || {}).reduce((a, b) => a + (b | 0), 0);
    if (spend > (this.unspent | 0)) return false;
    for (const k of Object.keys(points || {})) {
      const v = (this.stats?.[k] ?? 12) + (points[k] | 0);
      this.stats[k] = Math.max(10, Math.min(60, v | 0));
    }
    this.unspent = (this.unspent | 0) + 0 - spend;
    this.meta && (this.meta.derived = null);
    // refresh HP bounds
    const d = this.getDerived();
    this.maxHP = d.HP | 0;
    if (!Number.isFinite(this.hp)) this.hp = this.maxHP;
    this.hp = Math.max(0, Math.min(this.maxHP, this.hp | 0));
    return true;
  };
}

function normalizeStateShape(s) {
  // party
  if (!Array.isArray(s.party)) s.party = [];
  s.party.forEach(ch => {
    ch.level   = Math.max(1, ch.level | 0);
    ch.xp      = ch.xp | 0;
    ch.unspent = Number.isFinite(ch.unspent) ? ch.unspent : 0;
    ch.stats   = ch.stats || { STR:12, DEX:12, CON:12, INT:12, WIS:12, LCK:12 };
    ch.equipment = ch.equipment || {};                 // IDs only
    ch.meta = ch.meta || { abilitiesUnlocked: [], derived: null };
    ch.temp = ch.temp || {};
    // derive HP from stats/class
    const d = derivedFrom(ch.stats, { armor:0, ward:0, weapon:0, focus:0, baseHP: baseHPFor(ch.clazz) });
    ch.maxHP = d.HP | 0;
    if (!Number.isFinite(ch.hp)) ch.hp = ch.maxHP;
    ch.hp = Math.max(0, Math.min(ch.maxHP, ch.hp | 0));
    // attach runtime methods
    reattachCharacterRuntime(ch);
  });

  // inventory: strict array of { id, qty }
  if (!Array.isArray(s.inventory)) s.inventory = [];
  s.inventory = s.inventory
    .filter(e => e && typeof e.id === "string" && Number.isFinite(e.qty))
    .map(e => ({ id: e.id, qty: Math.max(0, e.qty | 0) }))
    .filter(e => e.qty > 0);

  // basic guards
  if (typeof s.gold !== "number") s.gold = 0;
  if (!s.quests || typeof s.quests !== "object") s.quests = {};
  if (!s.flags  || typeof s.flags  !== "object") s.flags  = {};
  if (typeof s.version !== "number") s.version = 2;
  if (!Array.isArray(s.xpCurve)) s.xpCurve = [0, 50, 125, 225, 350, 500, 700, 950, 1250, 1600, 2000];

  return s;
}

// --- API ---
export const Storage = {
  save() {
    const data = { v: State.version, state: State };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    Notifier.toast?.("Game saved.");
  },

  load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { Notifier.toast?.("No save found."); return false; }

    try {
      const obj = JSON.parse(raw);
      if (!obj || !obj.state) throw new Error("Invalid save");

      const normalized = normalizeStateShape(obj.state);
      // copy fields into the live State object (keep references stable)
      Object.keys(State).forEach(k => { delete State[k]; });
      Object.assign(State, normalized);

      Notifier.toast?.("Loaded.");
      Notifier.refresh?.();
      return true;
    } catch (e) {
      console.error("[Storage.load] failed:", e);
      Notifier.toast?.("Load failed.");
      return false;
    }
  },

  hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  },

  clear() {
    localStorage.removeItem(SAVE_KEY);
    Notifier.toast?.("Save cleared.");
  }
};

export default Storage;
