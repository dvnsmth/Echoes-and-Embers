// main.js — entry point (no Scenes references)

// ---------- Imports (match your import map) ----------
import { UI, SettingsUI } from "ui/ui.js";
import { StartMenu } from "ui/startmenu.js";

import { Town } from "town";                         // /scripts/town/index.js
import { openJournal } from "quests/journal.js";

import { State } from "systems/state.js";
import { Storage } from "systems/storage.js";
import { AudioManager } from "systems/audio.js";     // safe-guarded by optional chaining

// Combat / encounters
import { Combat } from "systems/combat/combat.js";
import { rollPreset, DIFFICULTY } from "systems/combat/encounterPresets.js";
import { buildEncounterFromTable } from "systems/combat/spawnTables.js";
import { instantiateEncounter, collapseEncounter, xpForEncounter } from "systems/combat/encounters.js";

// World helpers (avg level/party size)
import { partyLevelAvg, partySize } from "systems/world.js";

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
  select:  "Assets/SFX/computer click.mp3",
  hit:     "Assets/SFX/sword hit.mp3",
  heal:    "Assets/SFX/healing.mp3",
  victory: "Assets/SFX/victory.mp3",
  defeat:  "Assets/SFX/game over.mp3",
  item:    "Assets/SFX/potion use.mp3",
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

  // Initial music (see MediaManager in index.html)
  try { MediaManager?.setInitialMusic?.(["Assets/Music/start song.mp3"]); } catch {}

  // Audio
  initSfx();
  wireSettingsControls();

  // Harmless prebattle paint (ensures overlay doesn’t render empty later)
  renderPrebattle([]);

  // Journal hotkey
  const btnJ = document.getElementById("btnJournal");
  if (btnJ) btnJ.onclick = () => openJournal();
  document.addEventListener("keydown", (e) => {
    if ((e.key || "").toLowerCase() === "j") openJournal();
  });

  // Initial hero art
  try { setLocationMedia?.("Start"); } catch {}
});
