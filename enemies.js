// enemies.js — data only (ESM). Sorted A→Z by name.
// Conventions
// - tier: 1 (trash/normal), 2 (elite), 3 (champion), 4 (boss), 5 (mythic)
// - level: baseline recommendation (for a 1–12 campaign scale)
// - dmg: [min,max] for the default/basic attack
// - moves: normalized list of special actions
// - legacy-named moves are preserved (e.g., Goblin_Cry) for drop-in compatibility

export const TIER = {
  NORMAL: 1, ELITE: 2, CHAMPION: 3, BOSS: 4, MYTHIC: 5
};

export const ENEMIES = {
  "Awakened Tree": {
    key: "Awakened Tree", family: "Plant", tier: TIER.CHAMPION, level: 6,
    hp: 25, atk: 7, def: 16, dmg: [3,10], ai: "random", emoji: "🌳 awakened tree",
    moves: [{ key: "slam", name: "Slam", type: "bludgeoning", dmg: [3,10] }],
    tags: ["forest"]
  },
  "Bandit": {
    key: "Bandit", family: "Humanoid", tier: TIER.NORMAL, level: 2,
    hp: 12, atk: 4, def: 12, dmg: [1,6], ai: "random", emoji: "🏴‍☠️ bandit",
    moves: [{ key: "slash", name: "Slash", type: "slashing", dmg: [1,6] }],
    tags: ["road","camp"]
  },
  "Bandit Captain": {
    key: "Bandit Captain", family: "Humanoid", tier: TIER.ELITE, level: 4,
    hp: 18, atk: 5, def: 14, dmg: [2,8], ai: "random", emoji: "🏴‍☠️ Bandit Captain",
    moves: [
      { key: "slash", name: "Slash", type: "slashing", dmg: [2,8] },
      { key: "dirty_move", name: "Dirty Move", type: "slashing", dmg: [3,8] }
    ],
    // legacy
    Dirty_Move: { dmg: [3,8], type: "slashing" },
    tags: ["road","camp"]
  },
  "Banshee": {
    key: "Banshee", family: "Undead", tier: TIER.ELITE, level: 5,
    hp: 14, atk: 5, def: 12, dmg: [2,6], ai: "random", emoji: "👻 banshee",
    moves: [{ key: "wail", name: "Wail", type: "psychic", dmg: [3,8] }],
    tags: ["ruin","night"]
  },
  "Bear": {
    key: "Bear", family: "Beast", tier: TIER.ELITE, level: 4,
    hp: 18, atk: 5, def: 14, dmg: [2,8], ai: "random", emoji: "🐻 bear",
    moves: [{ key: "maul", name: "Maul", type: "slashing", dmg: [2,8] }],
    tags: ["forest"]
  },
  "Beholder": {
    key: "Beholder", family: "Aberration", tier: TIER.BOSS, level: 11,
    hp: 40, atk: 10, def: 22, dmg: [6,14], ai: "random", emoji: "👁️ beholder",
    moves: [{ key: "eye_ray", name: "Eye Ray", type: "magical", dmg: [7,15] }],
    tags: ["dungeon","boss"]
  },
  "Black Dragon": {
    key: "Black Dragon", family: "Dragon", tier: TIER.BOSS, level: 11,
    hp: 48, atk: 11, def: 21, dmg: [7,15], ai: "random", emoji: "🐉 black dragon",
    moves: [
      { key: "claw", name: "Claw", type: "slashing", dmg: [7,15] },
      { key: "breath_acid", name: "Acid Breath", type: "acid", dmg: [9,18] }
    ],
    // legacy
    breathAttack: { dmg: [9,18], type: "acid" },
    tags: ["swamp","boss"]
  },
  "Blizzard Beast": {
    key: "Blizzard Beast", family: "Beast", tier: TIER.CHAMPION, level: 8,
    hp: 32, atk: 9, def: 17, dmg: [5,11], ai: "random", emoji: "❄️ blizzard beast",
    moves: [{ key: "frost_fang", name: "Frost Fang", type: "cold", dmg: [5,11] }],
    tags: ["tundra"]
  },
  "Bugbear": {
    key: "Bugbear", family: "Goblinoid", tier: TIER.ELITE, level: 5,
    hp: 18, atk: 6, def: 14, dmg: [2,8], ai: "random", emoji: "🐻 bugbear",
    moves: [{ key: "club", name: "Club", type: "bludgeoning", dmg: [2,8] }],
    tags: ["caves","forest"]
  },
  "Cave Spider": {
    key: "Cave Spider", family: "Beast", tier: TIER.NORMAL, level: 2,
    hp: 12, atk: 3, def: 11, dmg: [1,6], ai: "lowest", emoji: "🕷️ spider",
    moves: [
      { key: "bite", name: "Poison Bite", type: "poison", dmg: [2,6] }
    ],
    // legacy
    Poison_Bite: { dmg: [2,6], type: "poison" },
    tags: ["caves"]
  },
  "Dark Knight": {
    key: "Dark Knight", family: "Humanoid", tier: TIER.CHAMPION, level: 9,
    hp: 40, atk: 8, def: 18, dmg: [4,12], ai: "random", emoji: "🛡️ dark knight",
    moves: [{ key: "greatsword", name: "Greatsword", type: "slashing", dmg: [4,12] }],
    tags: ["dungeon","elite"]
  },
  "Demon": {
    key: "Demon", family: "Fiend", tier: TIER.BOSS, level: 10,
    hp: 30, atk: 9, def: 20, dmg: [5,12], ai: "random", emoji: "👹 demon",
    moves: [{ key: "hellfire", name: "Hellfire", type: "fire", dmg: [6,13] }],
    tags: ["hell","boss"]
  },
  "DireWolf": {
    key: "DireWolf", family: "Beast", tier: TIER.ELITE, level: 3,
    hp: 12, atk: 4, def: 12, dmg: [2,5], ai: "random", emoji: "🐺 direwolf",
    moves: [{ key: "bite", name: "Bite", type: "piercing", dmg: [2,5] }],
    tags: ["forest","pack"]
  },
  "Ent": {
    key: "Ent", family: "Plant", tier: TIER.BOSS, level: 9,
    hp: 35, atk: 9, def: 20, dmg: [5,12], ai: "random", emoji: "🌳 ent",
    moves: [{ key: "crush", name: "Crush", type: "bludgeoning", dmg: [5,12] }],
    tags: ["forest","ancient"]
  },
  "Frost Giant": {
    key: "Frost Giant", family: "Giant", tier: TIER.BOSS, level: 10,
    hp: 40, atk: 10, def: 20, dmg: [6,14], ai: "random", emoji: "🧊 frost giant",
    moves: [{ key: "greataxe", name: "Greataxe", type: "slashing", dmg: [6,14] }],
    tags: ["tundra","boss"]
  },
  "Giant Spider": {
    key: "Giant Spider", family: "Beast", tier: TIER.CHAMPION, level: 6,
    hp: 20, atk: 5, def: 14, dmg: [2,8], ai: "random", emoji: "🕷️ giant spider",
    moves: [
      { key: "poison_bite", name: "Poison Bite", type: "poison", dmg: [3,8] },
      { key: "web", name: "Web", type: "web", dmg: [4,10] }
    ],
    // legacy
    Poison_Bite: { dmg: [3,8], type: "poison" },
    web: { dmg: [4,10], type: "web" },
    tags: ["caves","forest"]
  },
  "Gnoll": {
    key: "Gnoll", family: "Humanoid", tier: TIER.NORMAL, level: 3,
    hp: 14, atk: 4, def: 12, dmg: [2,6], ai: "random", emoji: "🐺 gnoll",
    moves: [{ key: "bite", name: "Bite", type: "piercing", dmg: [2,6] }],
    tags: ["savanna"]
  },
  "Goblin": {
    key: "Goblin", family: "Goblinoid", tier: TIER.NORMAL, level: 1,
    hp: 8, atk: 3, def: 10, dmg: [1,4], ai: "lowest", emoji: "🗡️ goblin",
    moves: [
      { key: "stab", name: "Stab", type: "piercing", dmg: [1,4] },
      { key: "goblin_cry", name: "Goblin Cry", type: "psychic", dmg: [2,6] }
    ],
    // legacy
    Goblin_Cry: { dmg: [2,6], type: "psychic" },
    tags: ["plains","caves","common"]
  },
  "Goblin Captain": {
    key: "Goblin Captain", family: "Goblinoid", tier: TIER.ELITE, level: 4,
    hp: 16, atk: 4, def: 12, dmg: [2,5], ai: "random", emoji: "👹 captain",
    moves: [
      { key: "cunning_strike", name: "Cunning Strike", type: "slashing", dmg: [3,8] }
    ],
    // legacy
    Cunning_Strike: { dmg: [3,8], type: "slashing" },
    tags: ["plains","caves"]
  },
  "Hobgoblin": {
    key: "Hobgoblin", family: "Goblinoid", tier: TIER.ELITE, level: 4,
    hp: 16, atk: 5, def: 14, dmg: [2,6], ai: "random", emoji: "🏴‍☠️ hobgoblin",
    moves: [{ key: "sabre", name: "Sabre", type: "slashing", dmg: [2,6] }],
    tags: ["plains","warband"]
  },
  "Ice Drake": {
    key: "Ice Drake", family: "Dragon", tier: TIER.CHAMPION, level: 9,
    hp: 36, atk: 10, def: 18, dmg: [6,12], ai: "random", emoji: "❄️ ice drake",
    moves: [{ key: "frost_breath", name: "Frost Breath", type: "cold", dmg: [7,13] }],
    tags: ["tundra","sky"]
  },
  "Ice Elemental": {
    key: "Ice Elemental", family: "Elemental", tier: TIER.CHAMPION, level: 8,
    hp: 35, atk: 9, def: 18, dmg: [5,12], ai: "random", emoji: "❄️ ice elemental",
    moves: [{ key: "glacial_fist", name: "Glacial Fist", type: "cold", dmg: [5,12] }],
    tags: ["tundra"]
  },
  "Imp": {
    key: "Imp", family: "Fiend", tier: TIER.NORMAL, level: 2,
    hp: 8, atk: 4, def: 10, dmg: [1,6], ai: "random", emoji: "👺 imp",
    moves: [{ key: "sting", name: "Sting", type: "poison", dmg: [1,6] }],
    tags: ["hell","skirmisher"]
  },
  "Lich": {
    key: "Lich", family: "Undead", tier: TIER.BOSS, level: 9,
    hp: 22, atk: 8, def: 18, dmg: [4,10], ai: "random", emoji: "🧙‍♂️ lich",
    moves: [{ key: "doom_bolt", name: "Doom Bolt", type: "magical", dmg: [5,12] }],
    tags: ["ruin","boss"]
  },
  "Mimic": {
    key: "Mimic", family: "Aberration", tier: TIER.CHAMPION, level: 6,
    hp: 18, atk: 6, def: 12, dmg: [2,8], ai: "random", emoji: "🪄 mimic",
    moves: [{ key: "adhesive_bite", name: "Adhesive Bite", type: "piercing", dmg: [2,8] }],
    tags: ["dungeon","trap"]
  },
  "Ogre Troll": { // renamed for uniqueness in UI if you prefer keep "Troll"
    key: "Troll", family: "Giant", tier: TIER.CHAMPION, level: 7,
    hp: 30, atk: 6, def: 16, dmg: [3,10], ai: "random", emoji: "🧌 troll",
    moves: [{ key: "club", name: "Club", type: "bludgeoning", dmg: [3,10] }],
    tags: ["caves","bridge"]
  },
  "Orc": {
    key: "Orc", family: "Orc", tier: TIER.ELITE, level: 3,
    hp: 15, atk: 4, def: 12, dmg: [2,6], ai: "random", emoji: "👺 orc",
    moves: [{ key: "power_attack", name: "Power Attack", type: "slashing", dmg: [4,10] }],
    // legacy
    PowerAttack: { dmg: [4,10], type: "slashing" },
    tags: ["warband"]
  },
  "Owlbear": {
    key: "Owlbear", family: "Beast", tier: TIER.CHAMPION, level: 7,
    hp: 25, atk: 7, def: 16, dmg: [3,10], ai: "random", emoji: "🐻 owlbear",
    moves: [{ key: "rend", name: "Rend", type: "slashing", dmg: [3,10] }],
    tags: ["forest"]
  },
  "Shambling Mound": {
    key: "Shambling Mound", family: "Plant", tier: TIER.CHAMPION, level: 8,
    hp: 28, atk: 8, def: 18, dmg: [4,12], ai: "random", emoji: "🌿 shambling mound",
    moves: [{ key: "engulf", name: "Engulf", type: "bludgeoning", dmg: [4,12] }],
    tags: ["swamp"]
  },
  "Skeleton": {
    key: "Skeleton", family: "Undead", tier: TIER.NORMAL, level: 2,
    hp: 12, atk: 4, def: 12, dmg: [1,6], ai: "random", emoji: "💀 skeleton",
    moves: [{ key: "shortsword", name: "Shortsword", type: "piercing", dmg: [1,6] }],
    tags: ["crypt"]
  },
  "Slime": {
    key: "Slime", family: "Ooze", tier: TIER.NORMAL, level: 1,
    hp: 10, atk: 3, def: 10, dmg: [1,4], ai: "lowest", emoji: "🟢 slime",
    moves: [{ key: "pseudopod", name: "Pseudopod", type: "acid", dmg: [1,4] }],
    tags: ["caves","tutorial"]
  },
  "Snow Golem": {
    key: "Snow Golem", family: "Construct", tier: TIER.CHAMPION, level: 7,
    hp: 30, atk: 8, def: 16, dmg: [4,10], ai: "random", emoji: "❄️ snow golem",
    moves: [{ key: "frost_slam", name: "Frost Slam", type: "cold", dmg: [4,10] }],
    tags: ["tundra"]
  },
  "Specter": {
    key: "Specter", family: "Undead", tier: TIER.CHAMPION, level: 6,
    hp: 16, atk: 6, def: 14, dmg: [2,8], ai: "random", emoji: "👻 specter",
    moves: [{ key: "chill_touch", name: "Chill Touch", type: "necrotic", dmg: [2,8] }],
    tags: ["ruin","night"]
  },
  "Treant": {
    key: "Treant", family: "Plant", tier: TIER.CHAMPION, level: 8,
    hp: 30, atk: 8, def: 18, dmg: [4,12], ai: "random", emoji: "🌳 treant",
    moves: [{ key: "branch_slam", name: "Branch Slam", type: "bludgeoning", dmg: [4,12] }],
    tags: ["forest","ancient"]
  },
  "Vine Blight": {
    key: "Vine Blight", family: "Plant", tier: TIER.ELITE, level: 5,
    hp: 22, atk: 7, def: 16, dmg: [4,10], ai: "random", emoji: "🌿 vine blight",
    moves: [{ key: "entangle", name: "Entangle", type: "poison", dmg: [4,10] }],
    tags: ["forest","swamp"]
  },
  "White Dragon": {
    key: "White Dragon", family: "Dragon", tier: TIER.BOSS, level: 12,
    hp: 50, atk: 12, def: 22, dmg: [8,16], ai: "random", emoji: "🐉 white dragon",
    moves: [
      { key: "claw", name: "Claw", type: "slashing", dmg: [8,16] },
      { key: "breath_cold", name: "Cold Breath", type: "cold", dmg: [10,20] }
    ],
    // legacy
    breathAttack: { dmg: [10,20], type: "cold" },
    tags: ["tundra","boss"]
  },
  "Will-o'-Wisp": {
    key: "Will-o'-Wisp", family: "Spirit", tier: TIER.NORMAL, level: 2,
    hp: 6, atk: 5, def: 8, dmg: [1,4], ai: "random", emoji: "🌫️ wisp",
    moves: [{ key: "shock", name: "Shock", type: "lightning", dmg: [1,4] }],
    tags: ["swamp","night"]
  },
  "Wolf": {
    key: "Wolf", family: "Beast", tier: TIER.NORMAL, level: 1,
    hp: 10, atk: 3, def: 11, dmg: [1,5], ai: "lowest", emoji: "🐺 wolf",
    moves: [{ key: "bite", name: "Bite", type: "piercing", dmg: [1,5] }],
    tags: ["forest","pack"]
  },
  "Wolf Pack": {
    key: "Wolf Pack", family: "Beast", tier: TIER.ELITE, level: 4,
    hp: 30, atk: 8, def: 16, dmg: [4,10], ai: "random", emoji: "🐺 wolf pack",
    moves: [{ key: "pack_tactics", name: "Pack Tactics", type: "piercing", dmg: [5,12] }],
    // legacy
    Pack_Tactics: { dmg: [5,12], type: "piercing" },
    tags: ["forest","pack"]
  },
  "Wraith": {
    key: "Wraith", family: "Undead", tier: TIER.CHAMPION, level: 7,
    hp: 18, atk: 7, def: 16, dmg: [3,9], ai: "random", emoji: "👻 wraith",
    moves: [{ key: "life_drain", name: "Life Drain", type: "necrotic", dmg: [3,9] }],
    tags: ["ruin","night"]
  }
};

// Handy lists & helpers
export const ENEMY_LIST = Object.values(ENEMIES).sort((a, b) =>
  a.key.localeCompare(b.key)
);

// Level → allowable tiers (keeps low-levels away from bosses)
export function tiersForPartyLevel(level = 1) {
  if (level <= 2) return [TIER.NORMAL];
  if (level <= 4) return [TIER.NORMAL, TIER.ELITE];
  if (level <= 6) return [TIER.ELITE, TIER.CHAMPION];
  if (level <= 8) return [TIER.CHAMPION, TIER.BOSS];
  return [TIER.BOSS, TIER.MYTHIC];
}

// Filter enemies by party level (and optional biome/family/tags)
export function enemiesFor({ partyLevel = 1, biomes = null, families = null, tiers = null } = {}) {
  const allowed = tiers || tiersForPartyLevel(partyLevel);
  return ENEMY_LIST.filter(e =>
    allowed.includes(e.tier) &&
    (biomes ? biomes.some(b => e.tags?.includes(b)) : true) &&
    (families ? families.includes(e.family) : true)
  );
}

// XP curve stays separate so you can tune easily
export const XP_CURVE = [0, 50, 125, 225, 350, 500, 700, 950, 1250, 1600, 2000];

export default ENEMIES;
