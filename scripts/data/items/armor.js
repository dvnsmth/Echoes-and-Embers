// data/armor.js — armor & shields only. Pure data; no side-effects.

export const ARMOR = {
  // ——— Armor
  leather_armor: {
    id: "leather_armor",
    name: "Leather Armor",
    type: "armor",
    slot: "armor",
    icon: "🥋",
    price: 18,
    rarity: "common",
    mods: { DEF: 2 },
    description: "Supple leather jerkin. Better than cloth."
  },
  studded_leather: {
    id: "studded_leather",
    name: "Studded Leather",
    type: "armor",
    slot: "armor",
    icon: "🥋",
    price: 30,
    rarity: "uncommon",
    mods: { DEF: 3 },
    description: "Reinforced with metal studs for extra protection."
  },
  chain_shirt: {
    id: "chain_shirt",
    name: "Chain Shirt",
    type: "armor",
    slot: "armor",
    icon: "🧥",
    price: 45,
    rarity: "uncommon",
    mods: { DEF: 4 },
    description: "Interlocking rings provide solid defense."
  },
  scale_mail: {
    id: "scale_mail",
    name: "Scale Mail",
    type: "armor",
    slot: "armor",
    icon: "🧥",
    price: 65,
    rarity: "uncommon",
    mods: { DEF: 5 },
    description: "Overlapping plates that trade weight for safety."
  },

  // ——— Shields (equip in offhand)
  wooden_shield: {
    id: "wooden_shield",
    name: "Wooden Shield",
    type: "shield",
    slot: "offhand",
    icon: "🛡️",
    price: 15,
    rarity: "common",
    mods: { DEF: 2 },
    description: "Sturdy planks held with iron rivets."
  },
  iron_shield: {
    id: "iron_shield",
    name: "Iron Shield",
    type: "shield",
    slot: "offhand",
    icon: "🛡️",
    price: 35,
    rarity: "uncommon",
    mods: { DEF: 3 },
    description: "Heavier, but turns more blows."
  }
};

// Helpers
export const listByType = (type) =>
  Object.values(ARMOR).filter(i => i.type === type || i.slot === type);

export const listArmor  = () => Object.values(ARMOR).filter(i => i.type === "armor");
export const listShields = () => Object.values(ARMOR).filter(i => i.type === "shield" || i.slot === "offhand");

export default ARMOR;
