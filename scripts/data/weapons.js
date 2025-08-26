// data/weapons.js — weapons only. Pure data.

export const WEAPONS = {
  "iron_sword": {
    id: "iron_sword",
    name: "Iron Sword",
    type: "weapon",
    slot: "weapon",
    hands: 1,
    icon: "⚔️",
    price: 20,
    rarity: "common",
    dmg: [2, 6],       // your combat can read this as base weapon damage
    atk: 1,            // small attack bonus
    tags: ["sword", "melee"],
    description: "A well-balanced blade favored by militia."
  },
  "dagger": {
    id: "dagger",
    name: "Dagger",
    type: "weapon",
    slot: "weapon",
    hands: 1,
    icon: "🗡️",
    price: 8,
    rarity: "common",
    dmg: [1, 4],
    crit: 5,
    tags: ["light", "melee"],
    description: "Quick and quiet. Favored by scouts."
  },
  "hunting_bow": {
    id: "hunting_bow",
    name: "Hunting Bow",
    type: "weapon",
    slot: "weapon",
    hands: 2,
    icon: "🏹",
    price: 24,
    rarity: "common",
    dmg: [2, 6],
    atk: 1,
    tags: ["bow", "ranged"],
    req: { DEX: 12 },
    description: "A flexible yew bow fit for small game—and bandits."
  }
};

export default WEAPONS;
