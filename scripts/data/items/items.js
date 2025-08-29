// data/items.js — non-weapon items. Pure data; no side-effects.

export const ITEMS = {
  // ————— Consumables
  "minor_tonic": {
    id: "minor_tonic",
    name: "Minor Tonic",
    type: "consumable",
    icon: "🧪",
    price: 5,
    rarity: "common",
    effect: { heal: 10 }, // simple built-in effect your inventory system can handle
    description: "A modest restorative. Restores a bit of health."
  },
  "torch": {
    id: "torch",
    name: "Torch",
    type: "consumable",
    icon: "🔥",
    price: 2,
    rarity: "common",
    effect: { light: true },
    description: "Burns for a while, pushing back the dark."
  },

  

  // ————— Materials / Quest (non-equippable)
  "sturdy_rope": {
    id: "sturdy_rope",
    name: "Sturdy Rope",
    type: "material",
    icon: "🪢",
    price: 3,
    rarity: "common",
    description: "Trusted by climbers and cautious adventurers."
  },
  "goblin_token": {
    id: "goblin_token",
    name: "Goblin Token",
    type: "quest",
    icon: "🪙",
    price: 0,
    rarity: "quest",
    description: "A mark of truce from the Hollowroot goblins."
  },
};

// Helpers (optional)
export const listByType = (type) => Object.values(ITEMS).filter(i => i.type === type);
export default ITEMS;
