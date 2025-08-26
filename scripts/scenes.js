// scenes.js — slim facade that re-exports town locations (aggregator style)
// Town buildings live in /town/*.js and are aggregated by ./town.js
// Quest flows (Edda, Cave Entrance, etc.) live in /quests/* (e.g., Hollowroot)

import { Town } from './town.js';

// Main surface: keep existing calls like Scenes.market(), Scenes.inn(), etc.
export const Scenes = { ...Town };

// Optional: re-export Dialogue & Journal so callers can keep importing via scenes.js
export { Dialogue } from './dialogue.js';
export { openJournal } from './scripts/quests/journal.js';

// (No dev auto-starts here; use console helpers or UI buttons to trigger encounters)
