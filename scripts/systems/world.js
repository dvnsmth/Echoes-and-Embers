// /scripts/systems/world.js — region + encounter glue
import { REGIONS } from '../data/regions.js';
import { State, Notifier } from './state.js';
import { rollPreset, DIFFICULTY } from '../systems/combat/encounterPresets.js';
import { buildEncounterFromTable } from '../data/spawnTables.js';
import { instantiateEncounter } from './combat/encounters.js';
import { Combat } from './combat/combat.js';
import { partyLevelAvg, partySize } from './party.js';

export function currentRegionKey() {
  return State.region || "Thornbridge";
}

export function setRegion(key) {
  if (!REGIONS[key]) throw new Error(`Unknown region: ${key}`);
  State.region = key;
  localStorage.setItem("region", key);
  try { setLocationMedia?.(REGIONS[key].mediaKey || "Wilderness"); } catch {}
  Notifier.refresh?.();
}

export function loadRegionFromSave() {
  const k = localStorage.getItem("region");
  setRegion(REGIONS[k] ? k : "Thornbridge");
}

/** Decide what to spawn given the current region + party */
export function pickEncounterDefs({
  useSpawnTable = false,
  difficulty = DIFFICULTY.STANDARD,
  seed = Date.now().toString(36),
} = {}) {
  const region = REGIONS[currentRegionKey()];

  if (useSpawnTable && region.spawnTables?.length) {
    const key = region.spawnTables[Math.floor(Math.random() * region.spawnTables.length)];
    return buildEncounterFromTable(key, {
      partyLevel: partyLevelAvg(),
      partySize:  partySize(),
      difficulty,
      seed
    });
  }

  if (region.presets?.length) {
    const key = region.presets[Math.floor(Math.random() * region.presets.length)];
    return rollPreset(key, {
      partyLevel: partyLevelAvg(),
      partySize:  partySize(),
      difficulty,
      seed
    });
  }

  // Fallback
  return rollPreset("forest_road_t1", {
    partyLevel: partyLevelAvg(),
    partySize:  partySize(),
    difficulty,
    seed
  });
}

/** Build foes and kick off combat using the best available entry point */
export function startRegionEncounter(opts = {}) {
  const defs = pickEncounterDefs(opts);
  const foes = instantiateEncounter(defs);

  if (Combat?.start) {
    Combat.start({ party: State.party, foes });
  } else if (window.Combat?.start) {
    window.Combat.start({ party: State.party, foes });
  } else {
    // Fallback: switch to combat screen and let your UI render the foes
    window.UI?.goto?.("combat");
    console.warn("[world] No combat engine entry point found; rendered combat screen only.", foes);
  }
}

// Re-export for convenience if other modules expect them here
export { partyLevelAvg, partySize };
export { DIFFICULTY } from "systems/combat/encounterPresets.js";