import TOWN from "data/town.json" with { type: "json" };

let town = {
  buildings:   { ...TOWN.start.buildings },     // { blacksmith:0, inn:1, ... }
  vendorTiers: { ...TOWN.start.vendorTiers },   // { market:1, blacksmith:0 }
  flags:       { ...TOWN.start.flags }          // { reviveEnabled:false }
};

export function getTown(){ return town; }
export function setTown(next){ town = next; }

export function getBuildingLevel(key){ return town.buildings[key] ?? 0; }
export function setBuildingLevel(key, level){
  town.buildings[key] = Math.max(0, level|0);
  return town.buildings[key];
}

export function bumpVendorTier(key, by = 1){
  town.vendorTiers[key] = (town.vendorTiers[key] ?? 0) + (by|0);
  return town.vendorTiers[key];
}

export function setFlag(key, value = true){ town.flags[key] = value; return value; }
export function hasFlag(key){ return !!town.flags[key]; }

// Reset to defaults (useful for New Game)
export function resetTown(){
  town = {
    buildings:   { ...TOWN.start.buildings },
    vendorTiers: { ...TOWN.start.vendorTiers },
    flags:       { ...TOWN.start.flags }
  };
}
