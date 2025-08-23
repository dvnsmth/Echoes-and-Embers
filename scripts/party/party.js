// party.js
// Party-wide state & helpers for Stonefall
// - Gold, members, inventory
// - Persistence (localStorage)
// - Simple event pub/sub for UI re-renders

// ---- Persistent State ----
const SAVE_KEY = 'stonefall.party.v1';

export const party = {
  version: 1,
  gold: 0,
  members: [],     // array of character objects (from makeCharacter)
  inventory: []    // [{ id, name, qty, tags?, meta? }]
};

// ---- Private: event hub ----
const subs = new Set();
function emit(change = 'party:change', payload = null) {
  for (const cb of subs) {
    try { cb({ type: change, party, payload }); } catch (e) { console.error(e); }
  }
}

// ---- Persistence ----
export function saveParty() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(party));
  } catch (e) {
    console.warn('Could not save party:', e);
  }
}

export function loadParty() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return party;
    const data = JSON.parse(raw);
    // Migration point if future versions differ:
    if (!data.version) data.version = 1;
    Object.assign(party, data);
  } catch (e) {
    console.warn('Could not load party, starting fresh:', e);
    resetParty();
  }
  emit('party:load');
  return party;
}

export function resetParty() {
  party.version = 1;
  party.gold = 0;
  party.members = [];
  party.inventory = [];
  saveParty();
  emit('party:reset');
  return party;
}

// Initialize from storage on first import
loadParty();

// ---- Subscriptions for UI ----
export function onPartyChange(cb) { subs.add(cb); return () => subs.delete(cb); }
export function offPartyChange(cb) { subs.delete(cb); }

// ---- Gold (party currency) ----
export function getGold() { return party.gold; }

export function setGold(value = 0) {
  party.gold = Math.max(0, Number(value) || 0);
  saveParty(); emit('party:gold:set', party.gold);
  return party.gold;
}

export function addGold(amount = 0) {
  party.gold = Math.max(0, party.gold + (Number(amount) || 0));
  saveParty(); emit('party:gold:add', amount);
  return party.gold;
}

export function spendGold(amount = 0) {
  const cost = Math.max(0, Number(amount) || 0);
  if (party.gold < cost) return false;
  party.gold -= cost;
  saveParty(); emit('party:gold:spend', cost);
  return true;
}

// ---- Members (characters) ----
// Tip: import makeCharacter from './character.js' when creating
export function addMember(characterObj) {
  if (!characterObj?.id) {
    console.warn('addMember: expected character with an id');
    return null;
  }
  party.members.push(characterObj);
  saveParty(); emit('party:member:add', characterObj.id);
  return characterObj;
}

export function removeMember(id) {
  const i = party.members.findIndex(m => m.id === id);
  if (i === -1) return false;
  const [removed] = party.members.splice(i, 1);
  saveParty(); emit('party:member:remove', removed?.id);
  return true;
}

export function getMember(id) {
  return party.members.find(m => m.id === id) || null;
}

export function updateMember(id, patch = {}) {
  const m = party.members.find(x => x.id === id);
  if (!m) return null;
  Object.assign(m, patch);
  saveParty(); emit('party:member:update', id);
  return m;
}

// ---- Inventory ----
function _findItemIndex(id) {
  return party.inventory.findIndex(i => i.id === id);
}

export function addItem({ id, name, qty = 1, tags = [], meta = {} }) {
  if (!id || !name) {
    console.warn('addItem: requires {id, name}');
    return null;
  }
  const i = _findItemIndex(id);
  if (i === -1) {
    party.inventory.push({ id, name, qty: Math.max(1, qty|0), tags, meta });
  } else {
    party.inventory[i].qty += Math.max(1, qty|0);
  }
  saveParty(); emit('party:item:add', id);
  return getItem(id);
}

export function removeItem(id, qty = 1) {
  const i = _findItemIndex(id);
  if (i === -1) return false;
  party.inventory[i].qty -= Math.max(1, qty|0);
  if (party.inventory[i].qty <= 0) party.inventory.splice(i, 1);
  saveParty(); emit('party:item:remove', id);
  return true;
}

export function getItem(id) {
  return party.inventory.find(i => i.id === id) || null;
}

export function getInventory() {
  return [...party.inventory];
}
