// ---------- Imports (all relative from /scripts/) ----------
import { UI, SettingsUI } from "./ui/ui.js";
import { StartMenu } from "./ui/startmenu.js";

import { Town } from "./town/index.js";              
import { openJournal } from "./quests/journal.js";

import { State } from "./systems/state.js";
import { Storage } from "./systems/storage.js";
import { AudioManager } from "./systems/audio.js";

// Combat / encounters
import { Combat } from "./systems/combat/combat.js";
import { rollPreset, DIFFICULTY } from "./systems/combat/encounterPresets.js";
import { instantiateEncounter, collapseEncounter, xpForEncounter } from "./systems/combat/encounters.js";

// Data + world helpers
import { buildEncounterFromTable } from "./data/spawnTables.js";
import { partyLevelAvg, partySize } from "./systems/world.js";




// Expose building functions + journal for index.html buttons
Object.assign(window, {
  townSquare:  Town.townSquare,
  inn:         Town.inn,
  market:      Town.market,
  gate:        Town.gate,
  blacksmith:  Town.blacksmith,
  openJournal,                                   // 📜 header & town screen button
});

// Also handy for console debugging
Object.assign(window, { UI, StartMenu, State, Storage, Combat, DIFFICULTY });

/* ========================================================================== */
/*                              AUDIO / SETTINGS                              */
/* ========================================================================== */

// --- SFX bootstrap (optional-chained in case your AudioManager is minimal) ---
const SFX_MAP = {
  select:  "Assets/audio/SFX/computer click.mp3",
  hit:     "Assets/audio/SFX/sword hit.mp3",
  heal:    "Assets/audio/SFX/healing.mp3",
  victory: "Assets/audio/SFX/victory.mp3",
  defeat:  "Assets/audio/SFX/game over.mp3",
  item:    "Assets/audio/SFX/potion use.mp3",
};

const LS_KEYS = { sfxVolume: "sfxVolume" };
const readNum = (k, d) => {
  const n = Number(localStorage.getItem(k));
  return Number.isFinite(n) ? n : d;
};

function initSfx() {
  try { AudioManager?.load?.(SFX_MAP); } catch {}
  try { AudioManager?.setVolume?.(readNum(LS_KEYS.sfxVolume, 0.8)); } catch {}
}

// --- Music helpers (MediaManager is defined inline in index.html) ---
const getBgmMuted = () => localStorage.getItem("bgmMuted") === "true";
const setBgmMuted = (flag) => {
  localStorage.setItem("bgmMuted", String(!!flag));
  try { MediaManager?.mute?.(!!flag); } catch {}
};
const getBgmVolume = () => {
  const v = parseFloat(localStorage.getItem("bgmVolume") || "0.7");
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7;
};
const setBgmVolume = (v) => {
  const vol = Math.max(0, Math.min(1, Number(v)));
  localStorage.setItem("bgmVolume", String(vol));
  try { MediaManager?.setVolume?.(vol); } catch {}
};

function wireSettingsControls() {
  const toggle = document.getElementById("music-toggle");
  const musicSlider = document.getElementById("bgm-volume");
  const sfxSlider = document.getElementById("sfx-volume");

  if (musicSlider) { musicSlider.value = String(getBgmVolume()); setBgmVolume(musicSlider.value); }
  if (musicSlider) musicSlider.oninput = () => setBgmVolume(musicSlider.value);

  if (sfxSlider) {
    const sfxV = readNum(LS_KEYS.sfxVolume, 0.8);
    sfxSlider.value = String(sfxV);
    try { AudioManager?.setVolume?.(sfxV); } catch {}
    sfxSlider.oninput = () => {
      const v = Number(sfxSlider.value);
      if (Number.isFinite(v)) {
        try { AudioManager?.setVolume?.(v); } catch {}
        localStorage.setItem(LS_KEYS.sfxVolume, String(v));
      }
    };
  }

  const paint = () => {
    const muted = getBgmMuted();
    if (toggle) {
      toggle.textContent = muted ? "Music: Off" : "Music: On";
      toggle.setAttribute("aria-pressed", (!muted).toString());
    }
  };
  paint();
  if (toggle) toggle.onclick = () => { setBgmMuted(!getBgmMuted()); paint(); };
}

/* ========================================================================== */
/*                        ENCOUNTER PREVIEW / STARTERS                         */
/* ========================================================================== */

function renderPrebattle(defs) {
  const rows = collapseEncounter(defs);
  const box = document.getElementById("pb-enemies");
  if (box) {
    box.innerHTML = rows
      .map(r => `${r.emoji ?? ""} <b>${r.key}</b> ×${r.count} <span class="tag">Lv ${r.level}</span>`)
      .join("<br>");
  }
  const xp = document.getElementById("pb-xp");
  if (xp) xp.textContent = String(xpForEncounter(defs, partyLevelAvg()));
}

function openPrebattle(defs, onConfirm) {
  renderPrebattle(defs);
  const overlay = document.getElementById("prebattle-overlay");
  if (!overlay) return;
  overlay.classList.remove("is-hidden");
  const start  = document.getElementById("pb-start");
  const cancel = document.getElementById("pb-cancel");
  if (start)  start.onclick  = () => { overlay.classList.add("is-hidden"); onConfirm?.(); };
  if (cancel) cancel.onclick = () => overlay.classList.add("is-hidden");
}

function startCombatWith(defs) {
  const foes = instantiateEncounter(defs);
  if (window.Combat?.start)      Combat.start({ party: State.party, foes });
  else if (window.startCombat)    window.startCombat({ party: State.party, foes });
  else console.warn("[encounters] No combat entry point found.");
}

// Public spawn helpers (handy for debug / buttons)
function TriggerEncounterPreset(presetKey = "forest_road_t1", opts = {}) {
  const defs = rollPreset(presetKey, {
    partyLevel: opts.partyLevel ?? partyLevelAvg(),
    partySize:  opts.partySize  ?? partySize(),
    difficulty: opts.difficulty ?? DIFFICULTY.STANDARD,
    seed:       opts.seed ?? Date.now().toString(36),
    biomes:     opts.biomes,
    families:   opts.families,
    maxEnemies: opts.maxEnemies,
    allowBossesBelowHard: opts.allowBossesBelowHard,
  });
  openPrebattle(defs, () => startCombatWith(defs));
}

function TriggerEncounterTable(tableKey = "forest_road_t1", opts = {}) {
  const defs = buildEncounterFromTable(tableKey, {
    partyLevel: opts.partyLevel ?? partyLevelAvg(),
    partySize:  opts.partySize  ?? partySize(),
    difficulty: opts.difficulty ?? DIFFICULTY.STANDARD,
    seed:       opts.seed ?? Date.now().toString(36),
    maxEnemies: opts.maxEnemies,
  });
  openPrebattle(defs, () => startCombatWith(defs));
}

Object.assign(window, { TriggerEncounterPreset, TriggerEncounterTable });

/* ========================================================================== */
/*                                   BOOT                                      */
/* ========================================================================== */

window.addEventListener("DOMContentLoaded", () => {
  // UI / menus
  UI?.init?.();
  SettingsUI?.init?.();
  StartMenu?.init?.();
    

  // 🔇 Do NOT start music here (browsers block it). We start it inside startmenu.js after a click.
  // try { MediaManager?.setInitialMusic?.(["Assets/audio/Music/That Zen Moment.mp3"]); } catch {}

  // Audio
  initSfx();
  wireSettingsControls();

  // Remember last active tab for "Continue"
  if (UI?.goto && !UI.goto.__wrappedForLastTab) {
    const orig = UI.goto.bind(UI);
    UI.goto = (id) => {
      try { localStorage.setItem('ui:lastTab', id); } catch {}
      return orig(id);
    };
    UI.goto.__wrappedForLastTab = true;
  }

  // Harmless prebattle paint (ensures overlay doesn’t render empty later)
  renderPrebattle([]);

    // Replace inline UI.goto handlers with event listeners
  const btnCreate = document.getElementById("btnCreateParty");
  if (btnCreate) btnCreate.onclick = () => UI.goto('create');
  const btnTown = document.getElementById("btnEnterTown");
  if (btnTown) btnTown.onclick = () => UI.goto('town');

  const btnJ = document.getElementById("btnJournal");
  if (btnJ) btnJ.onclick = () => openJournal();

// --- Start Screen bindings ---
const newGameBtn = document.getElementById("btn-newgame");
if (newGameBtn) {
  newGameBtn.addEventListener("click", () => {
    // switch art/music immediately to the Party theme
    try { setLocationMedia?.("CreateParty"); } catch {}

    // hide overlay and go to the Party screen
    document.getElementById("start-overlay")?.classList.add("is-hidden");
    UI.goto("create");
  });
}
  const continueBtn = document.getElementById("btn-continue");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      document.getElementById("start-overlay")?.classList.add("is-hidden");
      Storage.load();
    });
  }

  // Initial hero art
  try { setLocationMedia?.("Start"); } catch {}
});
