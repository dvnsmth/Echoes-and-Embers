// class.js (v0) — class data only
// Provide 'primary', 'hpBase', 'role', 'desc', and flat 'abilities' [{name, lvl}]

export const classes = {
  Warrior: {
    key: "Warrior",
    role: "Frontliner",
    primary: "STR",
    hpBase: 120,
    desc: "Martial prowess, defense, reliable damage.",
    // Keep names short & readable on mobile; lvl gates are for unlock UI
    abilities: [
      { name: "Guard", lvl: 1 },       // refunds 1 AP next turn if hit while Guarded
      { name: "Cleave", lvl: 2 },
      { name: "Last Stand", lvl: 3 },
    ],
    unlocks: ["Arena", "Gladiator"],  // narrative/system hooks (optional)
  },

  Ranger: {
    key: "Ranger",
    role: "Skirmisher",
    primary: "DEX",
    hpBase: 105,
    desc: "Nature-themed magics, set-ups into finishers.",
    abilities: [
      { name: "Snipe", lvl: 1 },
      { name: "Lay Trap", lvl: 1 },    // 1 AP setup → 2 AP finisher (later rule)
      { name: "Volley", lvl: 3 },
    ],
    unlocks: ["Charred Forest", "Druid"],
  },

  Rogue: {
    key: "Rogue",
    role: "Striker",
    primary: "DEX",
    hpBase: 100,
    desc: "Burst, chance, poison/bleed, disengage.",
    abilities: [
      { name: "Backstab", lvl: 1 },    // crit can refund 1 AP (1/turn) in combat rules
      { name: "Poisoned Blade", lvl: 2 },
      { name: "Shadowstep", lvl: 3 },
    ],
    unlocks: ["Thieves Guild"],
  },

  Wizard: {
    key: "Wizard",
    role: "Caster",
    primary: "INT",
    hpBase: 90,
    desc: "Direct damage, small AOE, shields, big spells gated by AP.",
    abilities: [
      { name: "Magic Bolt", lvl: 1 },
      { name: "Channel", lvl: 2 },     // skip actions; +1 AP next turn (cap 6)
      { name: "Arcane Aegis", lvl: 3 },
    ],
    unlocks: ["Wizard Tower", "Dragonling species"],
  },

  Cleric: {
    key: "Cleric",
    role: "Support",
    primary: "WIS",
    hpBase: 110,
    desc: "Targeted heals, sanctuary, revive.",
    abilities: [
      { name: "Mend", lvl: 1 },
      { name: "Sanctuary", lvl: 2 },
      { name: "Mass Heal", lvl: 3 },
    ],
    unlocks: ["Temple", "Resurrection"],
  },

  Bard: {
    key: "Bard",
    role: "Support/Control",
    primary: "WIS", // using WIS in your 6-stat model
    hpBase: 100,
    desc: "Inspire, debuff, party-wide buffs; synergy engine.",
    abilities: [
      { name: "Inspire", lvl: 1 },     // next ally skill costs 1 AP less
      { name: "Dissonant Chord", lvl: 2 },
      { name: "Encore", lvl: 3 },
    ],
    unlocks: [],
  },
};

export default classes;
