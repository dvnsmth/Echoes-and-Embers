// scripts/quests/lostcanyon.js — Lost Canyon
import { Dialogue } from "../ui/dialogue.js";
import { Notifier } from "../systems/state.js";
import { Combat } from "../systems/combat/combat.js";
import { addItem } from "../systems/inventory.js";
import { startQuest, setStage, completeQuest, getQuest } from "./core.js";
import { ENEMIES } from "../data/enemies.js";

export const LOST_CANYON_ID = "Q_LOST_CANYON";
const F = (...ids) => ids.map(id => ENEMIES[id]).filter(Boolean);

export function offer() {
  const q = startQuest(LOST_CANYON_ID, { name: "Lost Canyon", stage: 0, recommended: [3, 6] });
  Dialogue.show(
    "Caravan Master",
    `“Our wagons vanished in the <b>Lost Canyon</b>. Bring back the ledger and I’ll make it worth your while.”`,
    [
      { label: "Accept (mark canyon on map)", on: () => { setStage(LOST_CANYON_ID, 1); Notifier.toast("Quest started: Lost Canyon"); Dialogue.back(); } },
      { label: "Decline", on: () => Dialogue.back() },
    ],
    "town"
  );
  return q;
}

export function canyonEntrance() {
  setStage(LOST_CANYON_ID, 2);
  Dialogue.show(
    "Canyon Rim",
    `Sandstone walls plunge into shadow. Tracks skitter along narrow ledges.`,
    [
      { label: "Climb down (encounter)", on: () => {
          Combat.start({ foes: F("gnoll","gnoll"), skipPreview: true });
          Notifier.goto("combat");
        } },
      { label: "Scout around (find a rope)", on: () => { addItem("sturdy_rope"); Notifier.toast("Found: Sturdy Rope"); Dialogue.back(); } },
      { label: "Leave", on: () => Dialogue.back() },
    ],
    "town"
  );
}

export function bossLedge() {
  setStage(LOST_CANYON_ID, 3);
  Dialogue.show(
    "Thief-King’s Ledge",
    `A masked bandit captain glares. “The ledger buys lives. Yours, perhaps.”`,
    [
      { label: "Fight the Thief-King", on: () => {
          Combat.start({ foes: F("bandit_captain","bandit","bandit"), skipPreview: true });
          Notifier.goto("combat");
        } },
      { label: "Bargain (give 20g)", on: () => { completeQuest(LOST_CANYON_ID, { xp: 140, gold: 0, peaceful: true }); Dialogue.back(); } },
    ],
    "town"
  );
}

export const LostCanyonQuest = {
  id: LOST_CANYON_ID,
  name: "Lost Canyon",
  offer,
  canyonEntrance,
  bossLedge,
  get: () => getQuest(LOST_CANYON_ID),
};

// Named alias (for `import { LostCanyon } from "./lostcanyon.js"`)
export { LostCanyonQuest as LostCanyon };

// Default export stays the quest object
export default LostCanyonQuest;
