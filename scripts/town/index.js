// /scripts/town/index.js
// Aggregator for town buildings. Keeps imports explicit and side-effect free.
// Works with your import map alias: "town": "./scripts/town/index.js"

/**
 * Each building module should export a single function:
 * - square.js      → export function townSquare() { ... }
 * - inn.js         → export function inn() { ... }
 * - market.js      → export function market() { ... }
 * - gate.js        → export function gate() { ... }
 * - blacksmith.js  → export function blacksmith() { ... }
 *
 * If you haven't created a building yet, remove its import + spread below.
 */

import * as Square from "./square.js";
import * as Inn from "./inn.js";
import * as Market from "./market.js";
import * as Gate from "./gate.js";
import * as Blacksmith from "./blacksmith.js";

// Unified surface used by main.js to expose globals for index.html buttons
export const Town = {
  ...Square,     // townSquare()
  ...Inn,        // inn()
  ...Market,     // market()
  ...Gate,       // gate()
  ...Blacksmith, // blacksmith()
};

// Optional: also export the building functions directly for targeted imports
export { townSquare } from "./square.js";
export { inn } from "./inn.js";
export { market } from "./market.js";
export { gate } from "./gate.js";
export { blacksmith } from "./blacksmith.js";

// Auto-refresh simple screens on key events
on(EV.BuildingUpgraded, () => refreshIfVisible());
on(EV.RewardsGranted,   () => refreshIfVisible());
on(EV.RegionUnlocked,   () => refreshIfVisible());

function refreshIfVisible(){
  // If you have a simple router, check current screen and call its show()
  // Example (pseudo):
  // if (UI.current === "market") Market.show();
  // else if (UI.current === "blacksmith") Blacksmith.show();
  // else if (UI.current === "inn") Inn.show();
  void getTown(); // noop to assert import usage
}

export default Town;
