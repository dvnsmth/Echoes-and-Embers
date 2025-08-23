// inventory.js
// Lightweight inventory system with buy/sell helpers.
// Works with: State (save/load), Party gold (addGold/spendGold)

import { State } from './state.js';
import { addGold, spendGold } from './party.js';

// ---------- internals ----------
function ensureStore() {
  if (!State.inventory) State.inventory = [];
  return State.inventory;
}
function persist() {
  // Be graceful if your project exposes Storage.save() globally
  try {
    // eslint-disable-next-line no-undef
    if (typeof Storage !== 'undefined' && Storage.save) Storage.save();
  } catch (_) { /* noop */ }
}
function toast(msg) {
  try {
    // eslint-disable-next-line no-undef
    if (typeof Notifier !== 'undefined' && Notifier.toast) Notifier.toast(msg);
  } catch (_) { /* noop */ }
}

// Simple price table; extend from data later.
// buy = price you pay; sell defaults to floor(buy * SELL_MULTIPLIER) if not set.
const SELL_MULTIPLIER = 0.5;
const PRICE_TABLE = {
  'Minor Tonic': { buy: 5, sell: 3 },
  'Goblin Token': { buy: Infinity, sell: 3 }, // example: can sell but not buy
};

// ---------- queries ----------
export function list() {
  return ensureStore().slice();
}
export function getQty(name) {
  const it = ensureStore().find(i => i.name === name);
  return it ? it.qty : 0;
}
export function hasItem(name, qty = 1) {
  return getQty(name) >= qty;
}
export function getPrice(name, type = 'buy') {
  const rec = PRICE_TABLE[name];
  if (!rec) {
    if (type === 'sell') return 0;
    return Infinity; // unknown items can't be bought unless overridden
  }
  if (type === 'buy') return rec.buy;
  // sell
  return Number.isFinite(rec.sell) ? rec.sell : Math.floor(rec.buy * SELL_MULTIPLIER);
}
export function inventoryValue() {
  return ensureStore().reduce((sum, i) => sum + getPrice(i.name, 'sell') * i.qty, 0);
}

// ---------- mutations ----------
export function addItem(name, qty = 1, meta = null) {
  qty = Math.max(0, qty | 0);
  if (!qty) return { ok: true, qty: getQty(name) }; // noop
  const inv = ensureStore();
  const existing = inv.find(i => i.name === name);
  if (existing) {
    existing.qty += qty;
  } else {
    inv.push({ name, qty, meta });
  }
  persist();
  return { ok: true, qty: getQty(name) };
}

export function removeItem(name, qty = 1) {
  qty = Math.max(0, qty | 0);
  if (!qty) return { ok: true, qty: getQty(name) };
  const inv = ensureStore();
  const idx = inv.findIndex(i => i.name === name);
  if (idx === -1) return { ok: false, reason: 'missing', qty: 0 };
  const it = inv[idx];
  if (it.qty < qty) return { ok: false, reason: 'insufficient', qty: it.qty };
  it.qty -= qty;
  if (it.qty <= 0) inv.splice(idx, 1);
  persist();
  return { ok: true, qty: getQty(name) };
}

// ---------- market helpers ----------
export function buyItem(name, qty = 1, priceOverride) {
  qty = Math.max(1, qty | 0);
  const price = Number.isFinite(priceOverride) ? priceOverride : getPrice(name, 'buy');
  if (!Number.isFinite(price) || price < 0) return { ok: false, reason: 'unavailable' };
  const total = price * qty;
  if (!spendGold(total)) {
    toast('Not enough gold.');
    return { ok: false, reason: 'gold' };
  }
  addItem(name, qty);
  persist();
  return { ok: true, qty: getQty(name), spent: total };
}

export function sellItem(name, qty = 1, priceOverride) {
  qty = Math.max(1, qty | 0);
  const have = getQty(name);
  if (have < qty) return { ok: false, reason: 'insufficient', qty: have };
  const price = Number.isFinite(priceOverride) ? priceOverride : getPrice(name, 'sell');
  const total = Math.max(0, price) * qty;

  const removed = removeItem(name, qty);
  if (!removed.ok) return removed;

  addGold(total);
  persist();
  return { ok: true, gained: total, qty: getQty(name) };
}

// Optional helper: ensure there are no zero-qty entries (maintenance)
export function compact() {
  const inv = ensureStore();
  for (let i = inv.length - 1; i >= 0; i--) {
    if (!inv[i] || (inv[i].qty | 0) <= 0) inv.splice(i, 1);
  }
  persist();
  return inv.slice();
}
