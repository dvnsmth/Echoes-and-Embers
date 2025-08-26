// scripts/systems/inventory.js
// Strict inventory: IDs only, store = [{ id, qty }]. No migrations, no name mapping.

import { State, Notifier } from "systems/state.js";
import { Storage } from "systems/storage.js";
import { addGold, spendGold } from "systems/party.js";

import ITEMS   from "data/items.js";
import WEAPONS from "data/weapons.js";
import ARMOR   from "data/armor.js";

const ItemDB = Object.freeze({ ...ITEMS, ...WEAPONS, ...ARMOR });

function ensureStore() {
  if (!Array.isArray(State.inventory)) State.inventory = [];
  return State.inventory;
}
function saveRefresh() { Storage?.save?.(); Notifier?.refresh?.(); }
function toast(msg)    { Notifier?.toast?.(msg); }
function isId(id)      { return typeof id === "string" && !!ItemDB[id]; }

function findEntry(inv, id) { return inv.find(e => e.id === id) || null; }

// ---------- DB queries ----------
export function getItemData(id) {
  return isId(id) ? ItemDB[id] : null;
}
export function priceOf(id, kind = "buy") {
  const rec = getItemData(id);
  if (!rec) return kind === "sell" ? 0 : Infinity;
  if (kind === "sell") return Math.floor((rec.price ?? 0) * 0.5);
  return Number.isFinite(rec.price) ? rec.price : Infinity;
}

// ---------- inventory queries ----------
export function listInventory() {
  const inv = ensureStore();
  return inv.map(e => ({ id: e.id, qty: e.qty | 0, data: getItemData(e.id) }))
            .sort((a,b) => (a.data?.name || a.id).localeCompare(b.data?.name || b.id));
}
export function getQty(id) {
  if (!isId(id)) return 0;
  const ent = findEntry(ensureStore(), id);
  return ent ? (ent.qty | 0) : 0;
}
export function hasItem(id, qty = 1) { return getQty(id) >= Math.max(1, qty | 0); }
export function inventoryValue() {
  return listInventory().reduce((sum, e) => sum + priceOf(e.id, "sell") * e.qty, 0);
}

// ---------- mutations ----------
export function addItem(id, qty = 1, meta = null) {
  if (!isId(id)) return { ok: false, reason: "unknown-item" };
  const inv = ensureStore();
  const ent = findEntry(inv, id);
  if (ent) { ent.qty = (ent.qty | 0) + Math.max(1, qty | 0); }
  else     { inv.push({ id, qty: Math.max(1, qty | 0), meta }); }
  saveRefresh();
  return { ok: true, qty: getQty(id) };
}

export function removeItem(id, qty = 1) {
  if (!isId(id)) return { ok: false, reason: "unknown-item" };
  const inv = ensureStore();
  const ent = findEntry(inv, id);
  if (!ent) return { ok: false, reason: "missing", qty: 0 };
  const take = Math.max(1, qty | 0);
  if ((ent.qty | 0) < take) return { ok: false, reason: "insufficient", qty: ent.qty | 0 };
  ent.qty -= take;
  if ((ent.qty | 0) <= 0) {
    const i = inv.indexOf(ent);
    if (i >= 0) inv.splice(i, 1);
  }
  saveRefresh();
  return { ok: true, qty: getQty(id) };
}

// ---------- using consumables ----------
export function useItem(id, targetIndex = 0) {
  if (!isId(id)) return { ok:false, reason:"unknown-item" };
  const rec = getItemData(id);
  if (rec.type !== "consumable") return { ok:false, reason:"not-consumable" };
  if (getQty(id) <= 0)          return { ok:false, reason:"none-left" };

  let applied = false;

  if (rec.effect?.heal) {
    const party = State.party || [];
    const idx = Math.max(0, Math.min(targetIndex | 0, party.length - 1));
    const c = party[idx];
    if (!c) return { ok:false, reason:"no-target" };
    const max = c.maxHP ?? c.hp ?? 10;
    c.maxHP = max;
    c.hp = Math.min(max, (c.hp ?? max) + Number(rec.effect.heal));
    applied = true;
  }

  if (rec.effect?.light) {
    State.flags = State.flags || {};
    State.flags.light = true;
    applied = true;
  }

  const removed = removeItem(id, 1);
  if (!removed.ok) return removed;

  if (applied) toast(`${rec.icon ?? "🎒"} Used ${rec.name}.`);
  saveRefresh();
  return { ok:true, item:id, data:rec };
}

// ---------- market helpers ----------
export function buyItem(id, qty = 1, priceOverride) {
  if (!isId(id)) return { ok:false, reason:"unknown-item" };
  qty = Math.max(1, qty | 0);
  const price = Number.isFinite(priceOverride) ? priceOverride : priceOf(id, "buy");
  if (!Number.isFinite(price)) return { ok:false, reason:"unavailable" };
  const total = price * qty;
  if (!spendGold(total)) { toast("Not enough gold."); return { ok:false, reason:"gold" }; }
  addItem(id, qty);
  saveRefresh();
  return { ok:true, spent: total, qty: getQty(id) };
}

export function sellItem(id, qty = 1, priceOverride) {
  if (!isId(id)) return { ok:false, reason:"unknown-item" };
  qty = Math.max(1, qty | 0);
  const have = getQty(id);
  if (have < qty) return { ok:false, reason:"insufficient", qty: have };
  const price = Number.isFinite(priceOverride) ? priceOverride : priceOf(id, "sell");
  const total = Math.max(0, price) * qty;
  const removed = removeItem(id, qty);
  if (!removed.ok) return removed;
  addGold(total);
  saveRefresh();
  return { ok:true, gained: total, qty: getQty(id) };
}

export function compact() {
  const inv = ensureStore();
  for (let i = inv.length - 1; i >= 0; i--) {
    if (!inv[i] || (inv[i].qty | 0) <= 0 || !isId(inv[i].id)) inv.splice(i, 1);
  }
  saveRefresh();
  return inv.slice();
}

export { ItemDB };
export default {
  addItem, removeItem, getQty, hasItem, inventoryValue,
  listInventory, getItemData, priceOf,
  buyItem, sellItem, useItem, compact, ItemDB
};
