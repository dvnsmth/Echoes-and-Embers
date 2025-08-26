// /scripts/systems/inventory.js
// Data-driven inventory with ID + name support and simple buy/sell.
// Safe to call from Market/Blacksmith/Quests/UI.

import { State, Notifier } from "systems/state.js";
import { Storage } from "systems/storage.js";
import { addGold, spendGold } from "systems/party.js";

import ITEMS   from "data/items.js";
import WEAPONS from "data/weapons.js";
import ARMOR   from "data/armor.js";

// Merge all item DBs (IDs must be unique)
const ItemDB = Object.freeze({ ...ITEMS, ...WEAPONS, ...ARMOR });

// Normalize → map display names to IDs, and pass IDs through
const NAME_INDEX = (() => {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const map = new Map();
  for (const rec of Object.values(ItemDB)) {
    map.set(rec.id, rec.id);
    map.set(norm(rec.name), rec.id);
  }
  return {
    toId(x) {
      if (!x) return null;
      if (ItemDB[x]) return x;                 // already an ID
      const n = norm(x);
      return map.get(n) || null;               // display name → id
    }
  };
})();

// ---------- internals ----------
function ensureStore() {
  // We keep array-of-entries for compatibility: [{ name, qty, meta }]
  if (!Array.isArray(State.inventory)) State.inventory = [];
  return State.inventory;
}
function saveRefresh() { Storage?.save?.(); Notifier?.refresh?.(); }
function toast(msg)    { Notifier?.toast?.(msg); }

function findEntry(inv, id) {
  const display = ItemDB[id]?.name;
  return inv.find(e => e?.name === id || (display && e?.name === display)) || null;
}

// ---------- DB queries ----------
export function getItemData(idOrName) {
  const id = NAME_INDEX.toId(idOrName);
  return id ? ItemDB[id] : null;
}
export function priceOf(idOrName, kind = "buy") {
  const rec = getItemData(idOrName);
  if (!rec) return kind === "sell" ? 0 : Infinity;
  // You can enrich with rarity-based pricing later
  if (kind === "sell") return Math.floor((rec.price ?? 0) * 0.5);
  return Number.isFinite(rec.price) ? rec.price : Infinity;
}

// ---------- inventory queries ----------
export function listInventory() {
  const inv = ensureStore();
  return inv.map(e => {
    const id = NAME_INDEX.toId(e.name) || e.name;
    return { id, qty: e.qty | 0, data: getItemData(id) };
  });
}
export function getQty(idOrName) {
  const inv = ensureStore();
  const id = NAME_INDEX.toId(idOrName);
  if (!id) return 0;
  const ent = findEntry(inv, id);
  return ent ? (ent.qty | 0) : 0;
}
export function hasItem(idOrName, qty = 1) {
  return getQty(idOrName) >= Math.max(1, qty | 0);
}
export function inventoryValue() {
  return listInventory().reduce((sum, e) => sum + priceOf(e.id, "sell") * e.qty, 0);
}

// ---------- mutations ----------
export function addItem(idOrName, qty = 1, meta = null) {
  const inv = ensureStore();
  const id = NAME_INDEX.toId(idOrName);
  if (!id) return { ok: false, reason: "unknown-item" };

  const ent = findEntry(inv, id);
  if (ent) {
    ent.qty = (ent.qty | 0) + Math.max(1, qty | 0);
    // migrate legacy display-name entry to ID for consistency
    ent.name = id;
    if (meta) ent.meta = meta;
  } else {
    inv.push({ name: id, qty: Math.max(1, qty | 0), meta });
  }
  saveRefresh();
  return { ok: true, qty: getQty(id) };
}

export function removeItem(idOrName, qty = 1) {
  const inv = ensureStore();
  const id = NAME_INDEX.toId(idOrName);
  if (!id) return { ok: false, reason: "unknown-item" };

  const ent = findEntry(inv, id);
  if (!ent) return { ok: false, reason: "missing", qty: 0 };
  const take = Math.max(1, qty | 0);
  if ((ent.qty | 0) < take) return { ok: false, reason: "insufficient", qty: ent.qty | 0 };

  ent.qty -= take;
  if ((ent.qty | 0) <= 0) {
    const idx = ensureStore().indexOf(ent);
    if (idx >= 0) inv.splice(idx, 1);
  }
  saveRefresh();
  return { ok: true, qty: getQty(id) };
}

// ---------- market helpers ----------
export function buyItem(idOrName, qty = 1, priceOverride) {
  const id = NAME_INDEX.toId(idOrName);
  if (!id) return { ok: false, reason: "unknown-item" };
  const price = Number.isFinite(priceOverride) ? priceOverride : priceOf(id, "buy");
  if (!Number.isFinite(price)) return { ok: false, reason: "unavailable" };

  qty = Math.max(1, qty | 0);
  const total = price * qty;
  if (!spendGold(total)) { toast("Not enough gold."); return { ok: false, reason: "gold" }; }

  addItem(id, qty);
  saveRefresh();
  return { ok: true, spent: total, qty: getQty(id) };
}

export function sellItem(idOrName, qty = 1, priceOverride) {
  const id = NAME_INDEX.toId(idOrName);
  if (!id) return { ok: false, reason: "unknown-item" };

  qty = Math.max(1, qty | 0);
  const have = getQty(id);
  if (have < qty) return { ok: false, reason: "insufficient", qty: have };

  const price = Number.isFinite(priceOverride) ? priceOverride : priceOf(id, "sell");
  const total = Math.max(0, price) * qty;

  const removed = removeItem(id, qty);
  if (!removed.ok) return removed;

  addGold(total);
  saveRefresh();
  return { ok: true, gained: total, qty: getQty(id) };
}

// Maintenance: remove zero-qty entries
export function compact() {
  const inv = ensureStore();
  for (let i = inv.length - 1; i >= 0; i--) {
    if (!inv[i] || (inv[i].qty | 0) <= 0) inv.splice(i, 1);
  }
  saveRefresh();
  return inv.slice();
}

// ---------- legacy API (compat) ----------
export const list  = () => ensureStore().slice();
export const getPrice = (name, type = "buy") => priceOf(name, type);

// Expose DB if UIs need names/icons
export { ItemDB };
export default {
  addItem, removeItem, getQty, hasItem, inventoryValue,
  list, listInventory, getItemData, priceOf,
  buyItem, sellItem, compact, ItemDB
};
