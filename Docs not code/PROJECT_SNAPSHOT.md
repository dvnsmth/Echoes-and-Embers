PROJECT_SNAPSHOT.md

Project: Echoes & Embers
Repo: https://github.com/dvnsmth/Echoes-and-Embers

Snapshot date: Aug 25, 2025 (America/Phoenix)

TL;DR

ES modules + import map

All JS under /scripts

No Scenes.js; UI buttons call small globals from main.js

Town is an aggregator (/scripts/town/index.js), each building is its own file

Quests live under /scripts/quests/ with a journal & core state

Combat code under **/systems/combat/**

Regions: data in data/regions.js, logic in systems/world.js

Party management lives in systems/party.js

We use direct imports (no db.js barrel)

1) Current layout
/index.html
/Assets/                         # art & audio (note capital A)
  /Backgrounds/
  /Music/
  /SFX/
/docs/
  GDD Stonefall - Strategy RPG.docx
  PROJECT_SNAPSHOT.md            # ← this file
/scripts/
  /data/                         # data-only modules
    race.js
    class.js
    skills.js
    enemies.js
    regions.js
  /systems/                      # logic-only (no DOM)
    state.js
    storage.js
    utils.js
    stats.js
    character.js
    party.js
    world.js
    /combat/
      combat.js
      encounters.js
      encounterPresets.js
      spawnTables.js
    audio.js                     # optional; SFX mapping used in main.js
  /town/
    helpers.js
    square.js
    inn.js
    market.js
    gate.js
    blacksmith.js
    index.js                     # exports Town facade
  /quests/
    core.js                      # start/setStage/complete/list
    journal.js                   # Quest Journal UI
    quest.js                     # aggregator (exports { Hollowroot, LostCanyon, … })
    hollowroot.js                # Edda + Cave Entrance + Parley live here
    lostcanyon.js                # example / pattern
  /ui/
    ui.js                        # screen switching & common UI hooks
    dialogue.js                  # dialogue renderer (UI only)
    startmenu.js                 # new game / continue overlay
  /dev/
    encounter-demo.js            # optional console helpers
  main.js                        # entry point (exposes town globals, wires settings)


Import map (in index.html)

{
  "imports": {
    "data/":    "./scripts/data/",
    "systems/": "./scripts/systems/",
    "town/":    "./scripts/town/",
    "quests/":  "./scripts/quests/",
    "ui/":      "./scripts/ui/",
    "dev/":     "./scripts/dev/",
    "town":     "./scripts/town/index.js"
  }
}

2) Key decisions (why things are where)

Direct data imports: data/*.js are plain export objects; nothing in there touches DOM/state.

Systems are UI-free: systems/* can import from /data and other systems, but never modify the DOM.

Town as aggregator: Each building is its own module under /town/; town/index.js exports a single Town surface.

Quests own their flows: Dialogue lines & quest steps live with the quest (e.g., hollowroot.js).

Journal drives progression: The quests/journal.js screen lists Active/Completed and “Continue” routes to the next step.

World ⟂ Region: data/regions.js defines areas; systems/world.js selects encounters and tracks current region.

Party single source: systems/party.js owns party membership & gold helpers, used by town/quests/etc.

No Scenes.js: Buttons call globals exposed by main.js (see below). Keeps surface minimal and obvious.

3) What’s wired globally (from main.js)

These are used by index.html buttons and are safe to call:

// Buildings
window.townSquare = Town.townSquare;
window.inn        = Town.inn;
window.market     = Town.market;
window.gate       = Town.gate;
window.blacksmith = Town.blacksmith;

// Journal
window.openJournal = openJournal;

// (Dev) encounter helpers
window.TriggerEncounterPreset = TriggerEncounterPreset;
window.TriggerEncounterTable  = TriggerEncounterTable;


We intentionally do not expose low-level APIs globally (storage, state mutators), only user-facing actions.

4) Recent changes (what just landed)

index.html updated with import map + MediaManager and no Scenes.* calls.

main.js rewritten: no Scenes fallback; exposes building/journal globals; SFX/music/settings wired.

startmenu.js replaced: clean New/Continue flow using world.js.

Edda & Cave Entrance moved from town → quests/hollowroot.js.

Quest Journal implemented (quests/journal.js) with “Continue” routing.

Combat folders: encounters, encounterPresets, spawnTables, combat under systems/combat/.

party.js placed under systems/ and used across town/quests.

Removed: db.js and any legacy Scenes references.

5) Dev workflow
Run locally
npm i
npm run dev
# → http://localhost:5173

Quick scans
# lingering legacy usage
npm run check   # runs:
#  - scripts/dev/check-imports.mjs (alias-aware import verification + blocks Scenes/db.js)
#  - scripts/dev/check-assets.mjs   (verifies Assets/ paths in index.html)
npm run lint
npm run typecheck


See package.json, .eslintrc.cjs, and tsconfig.json for the exact config (aliases match the import map).

6) Coding conventions

/data: JSON-like exports only.

/systems: no DOM—pure logic; may import other systems and data.

/town: DOM/UI for buildings; can call systems & quests.

/quests: quest flow + dialogue nodes; use Dialogue.show(...) (UI) and QuestCore (state).

/ui: shared UI utilities and screens (dialogue, start menu, main UI shell).

Audio/Media: index.html includes MediaManager; SFX are loaded via AudioManager in main.js.

No circular deps: keep quest files small and reference helpers via aggregators when possible.

7) How to add a new feature (patterns)
New building: Apothecary

scripts/town/apothecary.js → export apothecary()

Add to scripts/town/index.js:

export * as Apothecary from "./apothecary.js";
export const Town = { ...Square, ...Inn, ...Market, ...Gate, ...Blacksmith, ...Apothecary };


Add a button in index.html that calls apothecary() or put it on the Town screen.

New quest: Bandit Road

scripts/quests/banditroad.js (offer(), campsite(), ambush(), etc.)

Register in scripts/quests/quest.js (export + add to map).

Optionally create scripts/quests/banditroad/dialogue.js if the node tree is big.

Hook from Town (notice board, NPC, or Journal “Continue”).

New region: Sunken Marsh

Add to data/regions.js with presets or spawnTables.

Use setRegion("SunkenMarsh") from an unlocked action.

8) Roadmap (shortlist)

Equipment & item effects (inventory UI exists; needs equip slots & stat hooks).

Status effects as data (data/status-effects.js) + resolver in combat.

Loot tables per region/quest outcome.

Save versioning & migration stubs in storage.js.

Optional build tooling (Vite) when ready to bundle.

9) Known gaps / watch-outs

Ensure all JS lives under /scripts; delete stray root copies to avoid import drift.

Asset case sensitivity matters (repo uses Assets/ with a capital A).

When moving files, re-run npm run check to catch broken imports.

10) Handy snippets

Using Dialogue in a quest

import { Dialogue } from "ui/dialogue.js";
Dialogue.show("Edda", "Bring peace if you can.", [
  { label: "Accept", on: () => { /* setStage/notify */ } },
  { label: "Ask for advice", on: () => Dialogue.show("Edda", "Go light-footed.", [{ label:"Thanks", on: Dialogue.back }], "town") }
], "town");


Starting a region-appropriate encounter

import { startRegionEncounter } from "systems/world.js";
startRegionEncounter(); // uses current region & party size/level


Party helpers

import { hasSpace, addMember, spendGold, addGold, partyLevelAvg } from "systems/party.js";

11) Contact & collaboration

When you open a new chat/thread, paste this block at the top so the assistant’s in sync:

Project: Echoes & Embers (ES modules + import map; all JS under /scripts)
Key facts: Town aggregator; quests own flows; Journal + world/regions; combat in systems/combat
Globals from main.js: townSquare, inn, market, gate, blacksmith, openJournal
Repo: https://github.com/dvnsmth/Echoes-and-Embers
Goal for this session: <one concrete task/bug>


End of snapshot.