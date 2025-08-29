// race.js (v0) — species data only
// Keys must match what your UI/character creator uses for the race <select>

export const races = {
  Human: {
    key: "Human",
    desc: "Adaptable, versatile, balanced.",
    // ALL: +2 applies to all stats (character.js applyRaceBonuses)
    bonus: { ALL: +2 },
    tags: ["versatile"],
    unlock: "default",
  },

  Elf: {
    key: "Elf",
    desc: "Long-lived, magical, agile, attuned to nature/mysticism.",
    bonus: { DEX: +2, INT: +1 },
    tags: ["agile", "mystic"],
    unlock: "default",
  },

  Dwarf: {
    key: "Dwarf",
    desc: "Hardy, tough, crafters of stone/metal.",
    bonus: { CON: +2, STR: +1 },
    tags: ["hardy", "craft"],
    unlock: "default",
  },

  Halfling: {
    key: "Halfling",
    desc: "Small, nimble, clever.",
    bonus: { DEX: +2, LCK: +1 },
    tags: ["nimble"],
    unlock: "default",
  },

  Goblinoid: {
    key: "Goblinoid",
    desc: "Tricksters; cunning, mischievous, underdog-coded.",
    bonus: { LCK: +2, DEX: +1 },
    tags: ["trickster"],
    unlock: "default",
  },

  Dragonling: {
    key: "Dragonling",
    desc: "Proud; elemental ancestry & breath.",
    bonus: { INT: +2, CON: +1 },
    tags: ["elemental"],
    // Marked unlockable per class questlines later
    unlock: "wizard-questline",
  },

  Giantborn: {
    key: "Giantborn",
    desc: "Mountainlike endurance; primal force.",
    bonus: { CON: +2, STR: +1 },
    tags: ["enduring"],
    unlock: "special-quest",
  },

  Orc: {
    key: "Orc",
    desc: "Fierce, strong, passionate warrior-coded.",
    bonus: { STR: +2, CON: +1 },
    tags: ["fierce"],
    unlock: "default",
  },
};

export default races;
