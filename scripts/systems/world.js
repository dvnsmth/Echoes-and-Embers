// systems/world.js — generic region + encounter glue
import { REGIONS } from "data/regions.js";
import { State, Notifier } from "systems/state.js";
import { rollPreset, DIFFICULTY } from "systems/combat/encounterPresets.js";
import { buildEncounterFromTable } from "systems/combat/spawnTables.js";
import { instantiateEncounter } from "systems/combat/encounters.js";

export function currentRegionKey(){ return State.region || "Thornbridge"; }

export function setRegion(key){
  if (!REGIONS[key]) throw new Error(`Unknown region: ${key}`);
  State.region = key;
  localStorage.setItem("region", key);
  try { setLocationMedia?.(REGIONS[key].mediaKey || "Wilderness"); } catch {}
  Notifier.refresh?.();
}

export function loadRegionFromSave(){
  const k = localStorage.getItem("region");
  setRegion(REGIONS[k] ? k : "Thornbridge");
}

export function partyLevelAvg(){
  const p = State.party || [];
  if (!p.length) return 1;
  return Math.max(1, Math.round(p.reduce((a,c)=>a+(c.level||1),0) / p.length));
}
export const partySize = () => (State.party?.length || 1);

export function pickEncounterDefs({
  useSpawnTable = false,
  difficulty = DIFFICULTY.STANDARD,
  seed = Date.now().toString(36),
} = {}){
  const region = REGIONS[currentRegionKey()];
  const lvl = partyLevelAvg();
  const size = partySize();

  if (useSpawnTable && region.spawnTables?.length){
    const key = region.spawnTables[Math.floor(Math.random()*region.spawnTables.length)];
    return buildEncounterFromTable(key, { partyLevel:lvl, partySize:size, difficulty, seed });
  }
  if (region.presets?.length){
    const key = region.presets[Math.floor(Math.random()*region.presets.length)];
    return rollPreset(key, { partyLevel:lvl, partySize:size, difficulty, seed });
  }
  return rollPreset("forest_road_t1", { partyLevel:lvl, partySize:size, difficulty, seed });
}

export function startRegionEncounter(opts = {}){
  const defs = pickEncounterDefs(opts);
  const foes = instantiateEncounter(defs);
  if (window.Combat?.start) Combat.start({ party: State.party, foes });
  else if (window.Scenes?.combat) Scenes.combat({ party: State.party, foes });
  else { Notifier.goto?.("combat"); console.warn("No combat entry point; provide your own hook.", foes); }
}
