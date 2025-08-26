// data/regions.js — static region definitions (no logic)
// Keys should match whatever you show in the UI / journal.
export const REGIONS = {
  Thornbridge: {
    key: "Thornbridge",
    biomes: ["forest", "road"],
    levelRange: [1, 4],
    presets: ["forest_road_t1"],     // encounterPresets keys
    spawnTables: ["forest_road_t1"], // spawn table keys
    heroMediaKey: "Town Square"      // for MediaManager
  },
  HollowrootCave: {
    key: "HollowrootCave",
    biomes: ["caves"],
    levelRange: [2, 5],
    presets: ["caves_t2"],
    spawnTables: ["caves_t2"],
    heroMediaKey: "Cave Entrance"
  },
  Tundra: {
    key: "Tundra",
    biomes: ["tundra"],
    levelRange: [6, 9],
    presets: ["tundra_elites_t3"],
    spawnTables: ["tundra_elites_t3"],
    heroMediaKey: "Wilderness"
  },
  DragonLair: {
    key: "DragonLair",
    biomes: ["tundra","swamp","sky"],
    levelRange: [9, 12],
    presets: ["boss_lair_dragon"],
    spawnTables: ["boss_lair_dragon"],
    heroMediaKey: "Wilderness"
  }
};

export const REGION_LIST = Object.values(REGIONS);
export default REGIONS;
