// scripts/systems/utils.js
// Small, framework-free helpers used across systems & quests. No DOM.

export const Utils = {
  rand(a = 0, b = 1) {
    a = Math.floor(a); b = Math.floor(b);
    if (b < a) [a, b] = [b, a];
    return Math.floor(Math.random() * (b - a + 1)) + a;
  },
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
  roll(sides = 20) { return Math.floor(Math.random() * Math.max(1, sides)) + 1; },
  uid() { return Math.random().toString(36).slice(2, 9); },
  choice(arr) { return Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined; },
  chance(p = 0.5) { return Math.random() < p; },
  shuffle(arr) {
    const a = Array.from(arr || []);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  pickN(arr, n = 1) { return Utils.shuffle(arr).slice(0, Math.max(0, n | 0)); },
  sampleWeighted(items, weight = (x) => x?.w ?? 1) {
    const list = Array.from(items || []);
    const weights = list.map(weight).map(Number);
    const total = weights.reduce((a, b) => a + Math.max(0, b || 0), 0);
    if (!total) return Utils.choice(list);
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
      r -= Math.max(0, weights[i] || 0);
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  },
};

export const clamp = Utils.clamp;
export const roll  = Utils.roll;

export function calcMod(v) {
  const n = Number.isFinite(v) ? v : 10;
  return Math.floor((n - 10) / 2);
}

export function deepClone(o) {
  try { return structuredClone(o); } catch { return JSON.parse(JSON.stringify(o)); }
}

export default Utils;
