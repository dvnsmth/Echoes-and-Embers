// skills.js — central skill registry (data only, no imports)

// Conventions
// - key: stable id used in code/combat
// - name: UI label
// - classes: which classes “own” this skill (useful for filters/menus)
// - type: "attack" | "support" | "utility"
// - damageType: "physical" | "magical" | "healing" | null
// - apCost: integer AP cost to use
// - cooldown: integer turns before you can use it again
// - target: "self" | "ally" | "enemy" | "allAllies" | "line" | "cone" | etc.
// - scaling: declarative hints for your combat resolver (stats.js will do math)
// - effects: array of declarative effects your resolver applies
// - tags: searchable labels for UI/tooltips
// - desc: short UX copy
// NOTE: Keep this file pure-data. Your combat engine should interpret fields.

export const SKILLS = {
  // —— Warrior
  guard: {
    key: "guard",
    name: "Guard",
    classes: ["Warrior"],
    type: "utility",
    damageType: null,
    apCost: 1,
    cooldown: 0,
    target: "self",
    scaling: null,
    effects: [
      { kind: "buff", stat: "DEF", mult: 1.5, duration: 1 },
      { kind: "trigger", on: "hitTakenThisTurn", grantAP: 1, limit: 1 } // AP refund once if hit
    ],
    tags: ["stance", "defense", "ap-refund"],
    desc: "Brace for impact. Gain DEF and refund 1 AP if struck this round."
  },
  cleave: {
    key: "cleave",
    name: "Cleave",
    classes: ["Warrior"],
    type: "attack",
    damageType: "physical",
    apCost: 2,
    cooldown: 0,
    target: "line",
    area: { shape: "line", length: 2 },
    scaling: { from: "STR", ratio: 1.10, flat: 0 }, // interpret in combat calc
    effects: [],
    tags: ["aoe", "melee"],
    desc: "Wide swing that hits enemies in a line."
  },
  last_stand: {
    key: "last_stand",
    name: "Last Stand",
    classes: ["Warrior"],
    type: "support",
    damageType: null,
    apCost: 2,
    cooldown: 3,
    target: "self",
    scaling: { from: "CON", ratio: 0.5, flat: 10 }, // used for shield amount
    effects: [
      { kind: "shield", amountFromScaling: true, duration: 2 },
      { kind: "buff", stat: "RES", add: 10, duration: 2 }
    ],
    tags: ["shield", "survival"],
    desc: "Gain a shield and resistance for two turns."
  },

  // —— Ranger
  snipe: {
    key: "snipe",
    name: "Snipe",
    classes: ["Ranger"],
    type: "attack",
    damageType: "physical",
    apCost: 2,
    cooldown: 0,
    target: "enemy",
    range: 3,
    scaling: { from: "DEX", ratio: 1.2, flat: 0 },
    effects: [{ kind: "critBonus", addPct: 10 }],
    tags: ["ranged", "single-target"],
    desc: "A precise, high-damage shot."
  },
  lay_trap: {
    key: "lay_trap",
    name: "Lay Trap",
    classes: ["Ranger"],
    type: "utility",
    damageType: null,
    apCost: 1,
    cooldown: 1,
    target: "tile",
    scaling: null,
    effects: [
      { kind: "zone", trigger: "enter", apply: { kind: "damage", damageType: "physical", scaling: { from: "DEX", ratio: 0.8 } } },
      { kind: "debuff", stat: "ATB", mult: 1.15, duration: 1 } // delay their next turn
    ],
    tags: ["setup", "control"],
    desc: "Place a trap that damages and slows the first enemy to enter."
  },
  volley: {
    key: "volley",
    name: "Volley",
    classes: ["Ranger"],
    type: "attack",
    damageType: "physical",
    apCost: 3,
    cooldown: 1,
    target: "area",
    area: { shape: "blast", radius: 1 },
    scaling: { from: "DEX", ratio: 0.9, flat: 0 },
    effects: [],
    tags: ["aoe", "ranged"],
    desc: "Loose a rain of arrows in a small area."
  },

  // —— Rogue
  backstab: {
    key: "backstab",
    name: "Backstab",
    classes: ["Rogue"],
    type: "attack",
    damageType: "physical",
    apCost: 2,
    cooldown: 0,
    target: "enemy",
    scaling: { from: "DEX", ratio: 1.0, flat: 0 },
    effects: [
      { kind: "positional", requirement: "flankedOrBehind", bonus: { damageMult: 1.5 } },
      { kind: "trigger", on: "crit", grantAP: 1, limit: 1 } // AP refund on crit (1/turn)
    ],
    tags: ["melee", "crit"],
    desc: "Strike from advantage for big crits; can refund 1 AP on crit."
  },
  poisoned_blade: {
    key: "poisoned_blade",
    name: "Poisoned Blade",
    classes: ["Rogue"],
    type: "attack",
    damageType: "physical",
    apCost: 1,
    cooldown: 0,
    target: "enemy",
    scaling: { from: "DEX", ratio: 0.6, flat: 0 },
    effects: [{ kind: "status", status: "Poison", chancePct: 60, potency: 4, duration: 2 }],
    tags: ["dot", "debuff"],
    desc: "Light strike with a high chance to inflict Poison."
  },
  shadowstep: {
    key: "shadowstep",
    name: "Shadowstep",
    classes: ["Rogue"],
    type: "utility",
    damageType: null,
    apCost: 1,
    cooldown: 2,
    target: "self",
    scaling: null,
    effects: [{ kind: "teleport", range: 2 }, { kind: "buff", stat: "EVADE", addPct: 15, duration: 1 }],
    tags: ["mobility", "evasion"],
    desc: "Blink a short distance and gain brief evasiveness."
  },

  // —— Wizard
  magic_bolt: {
    key: "magic_bolt",
    name: "Magic Bolt",
    classes: ["Wizard"],
    type: "attack",
    damageType: "magical",
    apCost: 1,
    cooldown: 0,
    target: "enemy",
    scaling: { from: "INT", ratio: 0.9, flat: 0 },
    effects: [],
    tags: ["basic", "ranged"],
    desc: "A quick arcane strike."
  },
  channel: {
    key: "channel",
    name: "Channel",
    classes: ["Wizard"],
    type: "utility",
    damageType: null,
    apCost: 0,
    cooldown: 1,
    target: "self",
    scaling: null,
    effects: [{ kind: "gainNextTurnAP", add: 1, cap: 6 }],
    tags: ["ap-gain", "setup"],
    desc: "Focus to gain +1 AP next turn (up to your cap)."
  },
  arcane_aegis: {
    key: "arcane_aegis",
    name: "Arcane Aegis",
    classes: ["Wizard"],
    type: "support",
    damageType: null,
    apCost: 2,
    cooldown: 2,
    target: "ally",
    scaling: { from: "INT", ratio: 0.7, flat: 0 },
    effects: [{ kind: "shield", amountFromScaling: true, duration: 2 }],
    tags: ["shield"],
    desc: "Conjure a protective shield on an ally."
  },

  // —— Cleric
  mend: {
    key: "mend",
    name: "Mend",
    classes: ["Cleric"],
    type: "support",
    damageType: "healing",
    apCost: 1,
    cooldown: 0,
    target: "ally",
    scaling: { from: "WIS", ratio: 0.9, flat: 6 },
    effects: [{ kind: "heal", amountFromScaling: true }],
    tags: ["heal", "single-target"],
    desc: "A swift restorative prayer."
  },
  sanctuary: {
    key: "sanctuary",
    name: "Sanctuary",
    classes: ["Cleric"],
    type: "support",
    damageType: null,
    apCost: 2,
    cooldown: 2,
    target: "ally",
    scaling: null,
    effects: [{ kind: "buff", stat: "RES", add: 15, duration: 2 }, { kind: "tauntRedirect", chancePct: 50 }],
    tags: ["protection"],
    desc: "Bless an ally with great resilience."
  },
  mass_heal: {
    key: "mass_heal",
    name: "Mass Heal",
    classes: ["Cleric"],
    type: "support",
    damageType: "healing",
    apCost: 3,
    cooldown: 3,
    target: "allAllies",
    scaling: { from: "WIS", ratio: 0.6, flat: 4 },
    effects: [{ kind: "heal", amountFromScaling: true }],
    tags: ["heal", "aoe"],
    desc: "Restore health to the entire party."
  },

  // —— Bard
  inspire: {
    key: "inspire",
    name: "Inspire",
    classes: ["Bard"],
    type: "support",
    damageType: null,
    apCost: 1,
    cooldown: 1,
    target: "ally",
    scaling: null,
    effects: [{ kind: "buff", stat: "AP_COST_NEXT_SKILL", add: -1, duration: 1, floor: 0 }],
    tags: ["buff", "ap-economy"],
    desc: "Bolster an ally, making their next skill cost 1 AP less."
  },
  dissonant_chord: {
    key: "dissonant_chord",
    name: "Dissonant Chord",
    classes: ["Bard"],
    type: "attack",
    damageType: "magical",
    apCost: 2,
    cooldown: 1,
    target: "enemy",
    scaling: { from: "WIS", ratio: 0.8, flat: 0 },
    effects: [{ kind: "debuff", stat: "ATK", addPct: -10, duration: 2 }],
    tags: ["debuff"],
    desc: "A jarring note that weakens the foe."
  },
  encore: {
    key: "encore",
    name: "Encore",
    classes: ["Bard"],
    type: "utility",
    damageType: null,
    apCost: 2,
    cooldown: 3,
    target: "ally",
    scaling: null,
    effects: [{ kind: "resetCooldowns", maxSkills: 1 }],
    tags: ["cooldown-reset"],
    desc: "Let an ally repeat a recent performance. Reset 1 skill’s cooldown."
  },
};

export const ALL_SKILL_KEYS = Object.keys(SKILLS);

// Helper if you ever want to pull multiple
export function getSkills(keys = []) {
  return keys.map(k => SKILLS[k]).filter(Boolean);
}

export default SKILLS;
