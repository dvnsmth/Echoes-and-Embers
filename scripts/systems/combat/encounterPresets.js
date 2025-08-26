// /scripts/systems/combat/encounterPresets.js
import { rollEncounter, DIFFICULTY } from "./encounters.js";
export { DIFFICULTY } from "./encounters.js";

export const PRESETS = {
  forest_road_t1: {
    key: "forest_road_t1",
    name: "Forest Road (Tier 1)",
    defaults: { biomes: ["forest", "road"], difficulty: DIFFICULTY.STANDARD, maxEnemies: 5, allowBossesBelowHard: false },
    recommendedLevels: [1, 4],
  },
  caves_t2: {
    key: "caves_t2",
    name: "Caves (Tier 2)",
    defaults: { biomes: ["caves"], difficulty: DIFFICULTY.HARD, maxEnemies: 5, allowBossesBelowHard: false },
    recommendedLevels: [3, 6],
  },
  crypt_undead_t2: {
    key: "crypt_undead_t2",
    name: "Crypt (Undead)",
    defaults: { biomes: ["crypt", "ruin"], families: ["Undead"], difficulty: DIFFICULTY.STANDARD, maxEnemies: 5, allowBossesBelowHard: false },
    recommendedLevels: [3, 6],
  },
  tundra_elites_t3: {
    key: "tundra_elites_t3",
    name: "Tundra Patrol",
    defaults: { biomes: ["tundra"], difficulty: DIFFICULTY.HARD, maxEnemies: 4, allowBossesBelowHard: false },
    recommendedLevels: [6, 9],
  },
  boss_lair_dragon: {
    key: "boss_lair_dragon",
    name: "Boss Lair: Dragon",
    defaults: { biomes: ["tundra","swamp","sky"], families:["Dragon"], difficulty: DIFFICULTY.DEADLY, maxEnemies: 3, allowBossesBelowHard: true },
    recommendedLevels: [9, 12],
  },
};

export function listPresets() {
  return Object.values(PRESETS).map(p => ({ key: p.key, name: p.name, recommendedLevels: p.recommendedLevels }));
}

export function rollPreset(presetKey, overrides = {}) {
  const preset = PRESETS[presetKey];
  if (!preset) throw new Error(`[encounterPresets] Unknown preset: ${presetKey}`);
  const cfg = {
    partyLevel: overrides.partyLevel ?? 1,
    partySize:  overrides.partySize  ?? 3,
    seed:       overrides.seed,
    difficulty: overrides.difficulty ?? preset.defaults.difficulty,
    biomes:     overrides.biomes     ?? preset.defaults.biomes,
    families:   overrides.families   ?? preset.defaults.families,
    maxEnemies: overrides.maxEnemies ?? preset.defaults.maxEnemies,
    allowBossesBelowHard: overrides.allowBossesBelowHard ?? preset.defaults.allowBossesBelowHard,
  };
  return rollEncounter(cfg);
}

export default PRESETS;
