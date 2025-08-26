// === main.js (clean, single copy) ===

import { UI, SettingsUI } from './ui/ui.js';
import { Settings } from '../state.js';
import { StartMenu } from '../startmenu.js'; // <- make sure the file on disk is startmenu.js
import { Scenes, Dialogue } from '../scenes.js';
import { Combat } from './combat/combat.js';
import { Sheet } from '../sheet.js';
import { AudioManager } from '../audio.js';
import { AudioSettings } from '../audiosettings.js';
// Encounter system (direct imports)
import { rollPreset, DIFFICULTY } from '../encounterPresets.js';
import { buildEncounterFromTable } from './data/spawnTables.js';
import { instantiateEncounter, collapseEncounter, xpForEncounter } from '../encounters.js';
import { State } from '../state.js'; // you already import Settings; add State, too

Object.assign(window, { UI, SettingsUI, Scenes, Dialogue, Combat, Sheet, Settings, State, AudioManager });

// ---------- SFX ----------
const SFX_MAP = {
  select:  'Assets/SFX/computer click.mp3',
  hit:     'Assets/SFX/sword hit.mp3',
  heal:    'Assets/SFX/healing.mp3',
  victory: 'Assets/SFX/victory.mp3',
  defeat:  'Assets/SFX/game over.mp3',
  item:    'Assets/SFX/potion use.mp3'
};
const LS = { sfxVolume:'sfxVolume' };
const num = (k,f)=>{ const n=Number(localStorage.getItem(k)); return Number.isFinite(n)?n:f; };
function initSfx(){
  AudioManager.load(SFX_MAP);
  AudioManager.setVolume(num(LS.sfxVolume, 0.8));
}

// ---------- Dynamic loader to guarantee MediaManager is available ----------
function scriptExists(src){
  return !![...document.scripts].find(s => s.getAttribute('src') === src);
}
function injectScriptOnce(src){
  return new Promise((resolve, reject) => {
    if (scriptExists(src)) return resolve('already-present');
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve(src);
    el.onerror = () => reject(new Error('load-failed:'+src));
    document.head.appendChild(el);
  });
}
async function ensureMediaManager(){
  if (window.MediaManager) return true;
  const candidates = [
  './ui/location_media.js',
    './scripts/location%20media.js',
    './location_media.js',
    './location%20media.js'
  ];
  for (const src of candidates){
    try {
      await injectScriptOnce(src);
      for (let i=0;i<10 && !window.MediaManager;i++){
        await new Promise(r=>setTimeout(r,50));
      }
      if (window.MediaManager) return true;
    } catch {}
  }
  console.error('[main] Could not load media manager. Tried:', candidates.join(', '));
  return false;
}

// ---------- Music helpers ----------
const getMuted = () => localStorage.getItem('bgmMuted') === 'true';
const setMuted = (flag) => {
  localStorage.setItem('bgmMuted', String(!!flag));
  try { MediaManager.mute(!!flag); } catch {}
};
const getVol   = () => {
  const v = parseFloat(localStorage.getItem('bgmVolume') || '0.7');
  return isNaN(v) ? 0.7 : Math.max(0, Math.min(1, v));
};
const setVol   = (v) => {
  const vol = Math.max(0, Math.min(1, Number(v)));
  localStorage.setItem('bgmVolume', String(vol));
  try { MediaManager.setVolume(vol); } catch {}
};
// ---------- Encounter wiring (pre-battle preview + launch) ----------
function partyLevelAvg() {
  const p = State.party || [];
  if (!p.length) return 1;
  const sum = p.reduce((a, c) => a + (c.level || 1), 0);
  return Math.max(1, Math.round(sum / p.length));
}
function partySize() { return (State.party || []).length || 1; }

function renderPrebattle(defs) {
  const box = document.getElementById('pb-enemies');
  const rows = collapseEncounter(defs);
  if (box) {
    box.innerHTML = rows.map(r =>
      `${r.emoji ?? ''} <b>${r.key}</b> ×${r.count} <span class="tag">Lv ${r.level}</span>`
    ).join('<br>');
  }
  const xp = document.getElementById('pb-xp');
  if (xp) xp.textContent = String(xpForEncounter(defs, partyLevelAvg()));
}

function openPrebattle(defs, onConfirm) {
  renderPrebattle(defs);
  const overlay = document.getElementById('prebattle-overlay');
  const start   = document.getElementById('pb-start');
  const cancel  = document.getElementById('pb-cancel');
  if (!overlay) return;

  overlay.classList.remove('is-hidden');

  // (Re)bind fresh handlers
  if (start)   start.onclick  = () => { overlay.classList.add('is-hidden'); onConfirm?.(); };
  if (cancel)  cancel.onclick = () => overlay.classList.add('is-hidden');
}

function startCombatWith(defs) {
  const foes = instantiateEncounter(defs);
  // Call whatever your combat entry point is:
  if (window.Combat?.start) {
    Combat.start({ party: State.party, foes });
  } else if (window.startCombat) {
    window.startCombat({ party: State.party, foes });
  } else if (window.Scenes?.combat) {
    Scenes.combat({ party: State.party, foes });
  } else {
    console.warn('[encounters] No combat entry point found.');
  }
}

// Public helpers you can call from Scenes or buttons:
function TriggerEncounterPreset(presetKey = 'forest_road_t1', opts = {}) {
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

// main.js — optional: journal button/shortcut
import { openJournal } from './quests/journal.js';

document.addEventListener('DOMContentLoaded', ()=>{
  const btnJ = document.getElementById('btnJournal');
  if (btnJ) btnJ.onclick = ()=>openJournal();
  // Keyboard: press "J" to open Journal (dev-friendly)
  document.addEventListener('keydown', (e)=>{
    if (e.key?.toLowerCase() === 'j') openJournal();
  });
});


function TriggerEncounterTable(tableKey = 'forest_road_t1', opts = {}) {
  const defs = buildEncounterFromTable(tableKey, {
    partyLevel: opts.partyLevel ?? partyLevelAvg(),
    partySize:  opts.partySize  ?? partySize(),
    difficulty: opts.difficulty ?? DIFFICULTY.STANDARD,
    seed:       opts.seed ?? Date.now().toString(36),
    maxEnemies: opts.maxEnemies,
  });
  openPrebattle(defs, () => startCombatWith(defs));
}

// Expose to console / other modules
Object.assign(window, {
  TriggerEncounterPreset,
  TriggerEncounterTable,
  DIFFICULTY,
});

// ---------- Wire a single, clean Settings panel ----------
function wireSettingsControls(){
  const toggle = document.getElementById('music-toggle');
  const musicSlider = document.getElementById('bgm-volume');
  const sfxSlider = document.getElementById('sfx-volume');
  const legacyMute = document.getElementById('set-mute');

  if (musicSlider) {
    musicSlider.value = String(getVol());
    setVol(musicSlider.value);
    musicSlider.oninput = () => setVol(musicSlider.value);
  }

  if (sfxSlider) {
    const sfxV = num(LS.sfxVolume, 0.8);
    sfxSlider.value = String(sfxV);
    AudioManager.setVolume(sfxV);
    sfxSlider.oninput = () => {
      const v = Number(sfxSlider.value);
      if (Number.isFinite(v)) {
        AudioManager.setVolume(v);
        localStorage.setItem(LS.sfxVolume, String(v));
      }
    };
  }

  const paint = () => {
    const muted = getMuted();
    if (toggle) {
      toggle.textContent = muted ? 'Music: Off' : 'Music: On';
      toggle.setAttribute('aria-pressed', (!muted).toString());
    }
    if (legacyMute) legacyMute.checked = muted;
  };
  paint();

  if (toggle) toggle.onclick = () => { setMuted(!getMuted()); paint(); };
  if (legacyMute) legacyMute.onchange = () => { setMuted(!!legacyMute.checked); paint(); };
}

// ---------- Boot ----------
window.addEventListener('DOMContentLoaded', async () => {
  // Core UI
  UI.init?.();
  Settings.load?.();
  SettingsUI.init?.();
  StartMenu.init?.();

  // Audio (SFX only — music handled by MediaManager once loaded)
  initSfx();
  try { AudioSettings.init({ sfx: SFX_MAP }); } catch {}
  try { AudioSettings.mount(document.getElementById('screen-settings')); } catch {}

  // Ensure the media manager script is actually loaded (works even if the file has a space)
  await ensureMediaManager();

  // Start music (autoplay may wait for first click; the manager will resume after interaction)
  try { window.MediaManager && MediaManager.setInitialMusic(["Assets/Music/start song.mp3"]); } catch {}

  // Wire the single Settings panel
  wireSettingsControls();
// Make sure pre-battle DOM nodes are found early
renderPrebattle([]); // harmless; ensures elements exist before first encounter

  // Paint Start hero on first load (image under tabs via MediaManager in index.html)
  try { setLocationMedia && setLocationMedia('Start'); } catch {}

  // Switch background+music on major screens
  (function waitAndPatchUIGoto(){
    const t = setInterval(() => {
      if (window.UI && typeof UI.goto === 'function') {
        clearInterval(t);
        const original = UI.goto.bind(UI);
        UI.goto = function(screen) {
          try {
           if (screen === 'menu')           setLocationMedia && setLocationMedia('Menu');       // was 'Start'
else if (screen === 'create')    setLocationMedia && setLocationMedia('CreateParty');
else if (screen === 'town')      setLocationMedia && setLocationMedia('Town Square');
else if (screen === 'sheet')     setLocationMedia && setLocationMedia('Sheet');
else if (screen === 'inventory') setLocationMedia && setLocationMedia('Inventory');
else if (screen === 'settings')  setLocationMedia && setLocationMedia('Settings');

          } catch(e) {}
          return original(screen);
        };
      }
    }, 50);
  })();
});
