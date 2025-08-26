import { rollPreset } from "../encounterPresets.js";
import { buildEncounterFromTable } from "../scripts/data/spawnTables.js";
import { instantiateEncounter, collapseEncounter, xpForEncounter } from "../encounters.js";

window.debugRollPreset = (preset="forest_road_t1", lvl=2, size=3, seed="demo") => {
  const defs = rollPreset(preset, { partyLevel: lvl, partySize: size, seed });
  console.table(collapseEncounter(defs));
  console.log("XP:", xpForEncounter(defs, lvl));
  return instantiateEncounter(defs);
};

window.debugSpawnTable = (table="crypt_undead_t2", lvl=4, size=3, seed="t2") => {
  const defs = buildEncounterFromTable(table, { partyLevel: lvl, partySize: size, seed });
  console.table(collapseEncounter(defs));
  console.log("XP:", xpForEncounter(defs, lvl));
  return instantiateEncounter(defs);
};
