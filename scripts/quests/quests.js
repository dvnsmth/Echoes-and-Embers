// quests/quests.js — aggregator / single import surface for quests
import { QuestCore, getQuest, startQuest, setStage, completeQuest, listActive, isActive } from "./core.js";
import HollowrootQuest, { HOLLOWROOT_ID } from "./hollowroot.js";
import LostCanyonQuest, { LOST_CANYON_ID } from "./lostcanyon.js";

export const QUESTS = {
  [HOLLOWROOT_ID]: HollowrootQuest,
  [LOST_CANYON_ID]: LostCanyonQuest,
};

// Convenience: named access
export const Hollowroot  = HollowrootQuest;
export const LostCanyon  = LostCanyonQuest;

// Pass-through core API
export {
  QuestCore, getQuest, startQuest, setStage, completeQuest, listActive, isActive
};

export default QUESTS;
