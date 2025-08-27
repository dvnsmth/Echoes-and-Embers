// scripts/systems/party.js
// Single source of truth for party membership + gold helpers (no DOM).
import { State, Notifier } from "./state.js";
import { Storage } from "./storage.js";

export const MAX_PARTY = 4;

/* ------------------------ internal ------------------------ */
function ensureParty() {
  if (!Array.isArray(State.party)) State.party = [];
  return State.party;
}
function saveNotify(save, notify) {
  if (notify) Notifier?.refresh?.();
  if (save)   Storage?.save?.();
}

/* --------------------- membership API --------------------- */
export function partyMembers() {
  return ensureParty().slice(); // shallow copy
}
export function partySize() {
  return ensureParty().length || 0;
}
export function hasSpace() {
  return partySize() < MAX_PARTY;
}
export function partyLevelAvg() {
  const p = ensureParty();
  if (!p.length) return 1;
  const sum = p.reduce((a, c) => a + (c?.level ?? 1), 0);
  return Math.max(1, Math.round(sum / p.length));
}

/** Add a character object to the party */
export function addMember(character, { save = true, notify = true } = {}) {
  const p = ensureParty();
  if (p.length >= MAX_PARTY) return { ok: false, reason: "full" };
  p.push(character);
  saveNotify(save, notify);
  return { ok: true, size: p.length };
}

/** Remove by index */
export function removeMemberAt(index, { save = true, notify = true } = {}) {
  const p = ensureParty();
  if (index < 0 || index >= p.length) return { ok: false, reason: "bad-index" };
  p.splice(index, 1);
  saveNotify(save, notify);
  return { ok: true, size: p.length };
}

/** Remove by id (if your characters have `id`) */
export function removeMemberById(id, { save = true, notify = true } = {}) {
  const p = ensureParty();
  const i = p.findIndex(c => c?.id === id);
  if (i === -1) return { ok: false, reason: "not-found" };
  return removeMemberAt(i, { save, notify });
}

/** Wipe party (e.g., new game) */
export function clearParty({ save = true, notify = true } = {}) {
  State.party = [];
  saveNotify(save, notify);
}

/* ------------------------- gold API ------------------------ */
export function getGold() {
  return Number(State.gold || 0);
}
export function hasGold(amount) {
  return getGold() >= Number(amount || 0);
}
export function addGold(amount = 0, { save = true, notify = true } = {}) {
  const a = Math.max(0, Number(amount || 0));
  State.gold = getGold() + a;
  saveNotify(save, notify);
  return State.gold;
}
export function spendGold(amount = 0, { save = true, notify = true } = {}) {
  const a = Math.max(0, Number(amount || 0));
  if (getGold() < a) return false;
  State.gold = getGold() - a;
  saveNotify(save, notify);
  return true;
}

/* ----------------- handy group calculations ---------------- */
export function highestStat(modKey = "DEX") {
  const p = ensureParty();
  return Math.max(...p.map(c => Number(c?.stats?.[modKey] ?? 10)), 10);
}
