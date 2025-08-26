// quests/core.js — centralized quest state & rewards (no UI)
// Keeps all mutable quest data in State.quests and handles rewards/saving.

import { State, Notifier } from '../state.js';
import { Storage } from '../storage.js';
import { addGold } from '../party/party.js';
import { grantXP } from '../systems/character.js';

function ensureState() {
  if (!State.quests) State.quests = {};
  return State.quests;
}

export function getQuest(id) {
  return ensureState()[id] || null;
}

export function startQuest(id, data = {}) {
  const q = getQuest(id);
  if (q) return q; // already started
  const quest = { id, name: data.name || id, stage: data.stage ?? 0, status: 'active', ...data };
  ensureState()[id] = quest;
  Storage.save(); Notifier.refresh();
  return quest;
}

export function setStage(id, stage) {
  const q = getQuest(id) || startQuest(id, { name: id });
  q.stage = stage;
  Storage.save(); Notifier.refresh();
  return q;
}

export function completeQuest(id, { xp = 100, gold = 25, peaceful = false } = {}) {
  const q = getQuest(id) || startQuest(id);
  q.status = 'done';
  q.stage = 999;

  if (gold) addGold(gold);
  if (xp) grantXP(xp);

  Notifier.toast(`Quest complete: ${q.name} (+${gold}g, +${xp} XP${peaceful ? ", peaceful" : ""})`);
  Storage.save(); Notifier.refresh();
  return q;
}

export function isActive(id) {
  const q = getQuest(id);
  return !!q && q.status === 'active';
}

export function listActive() {
  return Object.values(ensureState()).filter(q => q.status === 'active');
}

export const QuestCore = {
  getQuest, startQuest, setStage, completeQuest, isActive, listActive,
};
export default QuestCore;
