// === main.js (self-loading media manager + fixed Settings audio UI) ===

// DO NOT import the media file here; we will dynamically load it below
// import './scripts/location_media.js';

import { UI, SettingsUI } from './ui.js';
import { Settings } from './state.js';
import { StartMenu } from './startMenu.js';
import { Scenes, Dialogue } from './scenes.js';
import { Combat } from './combat.js';
import { Sheet } from './sheet.js';
import { AudioManager } from './audio.js';
import { AudioSettings } from './audiosettings.js';

Object.assign(window, { UI, SettingsUI, Scenes, Dialogue, Combat, Sheet, Settings, AudioManager });

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
    './scripts/location_media.js',
    './scripts/location%20media.js',
    './location_media.js',
    './location%20media.js'
  ];
  // try sequentially until one loads and defines MediaManager
  for (const src of candidates){
    try {
      await injectScriptOnce(src);
      // wait up to ~500ms for the IIFE to define globals
      for (let i=0;i<10 && !window.MediaManager;i++){
        await new Promise(r=>setTimeout(r,50));
      }
      if (window.MediaManager) return true;
    } catch { /* try next */ }
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

// ---------- Settings UI (bottom Audio card only): one slider + one toggle ----------
function bottomAudioPanel(root){
  const sfx = root.querySelector('input[type="range"][id*="sfx" i], input[type="range"][name*="sfx" i]');
  return sfx ? (sfx.closest('.panel, .section, .col, .row, div') || root) : null;
}

function wireBottomAudio(root){
  const panel = bottomAudioPanel(root);
  if (!panel) return;

  // Remove Preview / Preview All permanently
  panel.querySelectorAll('button').forEach(b => {
    const t = (b.textContent || '').toLowerCase().replace(/\s+/g,' ');
    if (t === 'preview' || t === 'preview all') b.remove();
  });

  // Ensure exactly one Music Volume slider (#bgm-volume), just above SFX
  let slider = panel.querySelector('#bgm-volume');
  if (!slider){
    // adopt an existing music slider if present; else create one
    slider =
      panel.querySelector('input[type="range"][id*="music" i]:not([id*="sfx" i])') ||
      panel.querySelector('input[type="range"][name*="music" i]:not([name*="sfx" i])');
    if (!slider){
      slider = document.createElement('input');
      slider.type = 'range';
      slider.id   = 'bgm-volume';
      slider.className = 'range';
      const row = document.createElement('div');
      row.className = 'row';
      row.style.cssText = 'gap:8px;align-items:center;margin-bottom:6px';
      const label = document.createElement('div'); label.textContent = 'Music Volume';
      row.appendChild(label); row.appendChild(slider);
      const sfx = panel.querySelector('input[type="range"][id*="sfx" i], input[type="range"][name*="sfx" i]');
      const sfxRow = sfx?.closest('.row') || sfx || panel.firstChild;
      panel.insertBefore(row, sfxRow);
    } else {
      slider.id = 'bgm-volume';
    }
  }
  if (!slider.min)  slider.min = '0';
  if (!slider.max)  slider.max = '1';
  if (!slider.step) slider.step = '0.05';
  slider.value = String(getVol());
  setVol(slider.value);
  slider.oninput = () => setVol(slider.value);

  // remove any other music sliders in this panel
  panel.querySelectorAll('input[type="range"]').forEach(r => {
    if (r === slider) return;
    const idn=(r.id||'').toLowerCase(), nm=(r.name||'').toLowerCase();
    if ((idn.includes('music')||idn.includes('bgm')||nm.includes('music')||nm.includes('bgm')) &&
        !(idn.includes('sfx')||nm.includes('sfx'))) r.remove();
  });

  // One Music On/Off button (id #music-toggle)
  let toggle = panel.querySelector('#music-toggle');
  if (!toggle){
    toggle = document.createElement('button');
    toggle.id = 'music-toggle';
    toggle.className = 'btn small';
    const firstRow = panel.querySelector('.row') || panel;
    firstRow.appendChild(toggle);
  }
  const paint = () => {
    const muted = getMuted();
    toggle.textContent = muted ? 'Music: Off' : 'Music: On';
    toggle.setAttribute('aria-pressed', (!muted).toString());
  };
  paint();

  // event delegation so it survives any re-render
  if (!panel.dataset.musicDelegated){
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('#music-toggle');
      if (!btn) return;
      const next = !getMuted();
      setMuted(next);
      paint();
    });
    panel.dataset.musicDelegated = '1';
  }

  // respect saved mute each time
  setMuted(getMuted());
}

function keepSettingsWired(){
  const root = document.getElementById('screen-settings');
  if (!root) return;
  const mo = new MutationObserver(() => wireBottomAudio(root));
  mo.observe(root, { childList: true, subtree: true });
  wireBottomAudio(root);
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

  // Settings wiring (one slider + one toggle; Preview buttons removed)
  keepSettingsWired();

  // Switch background+music on major screens
  (function waitAndPatchUIGoto(){
    const t = setInterval(() => {
      if (window.UI && typeof UI.goto === 'function') {
        clearInterval(t);
        const original = UI.goto.bind(UI);
        UI.goto = function(screen) {
          try {
            if (screen === 'create')      setLocationMedia && setLocationMedia('CreateParty');
            else if (screen === 'town')   setLocationMedia && setLocationMedia('Town Square');
            else if (screen === 'settings') setLocationMedia && setLocationMedia('Settings');
          } catch(e) {}
          return original(screen);
        };
      }
    }, 50);
  })();
});
// === SETTINGS AUDIO PATCH ===
// Removes "Preview"/"Preview All", and ensures ONE Music Volume slider + ONE Music On/Off toggle.
// Works with your existing UI and survives re-renders.
(function(){
  // Helpers use the same storage keys as MediaManager
  const getMuted = () => localStorage.getItem('bgmMuted') === 'true';
  const setMuted = (flag) => {
    localStorage.setItem('bgmMuted', String(!!flag));
    if (window.MediaManager) MediaManager.mute(!!flag);
  };
  const getVol = () => {
    const v = parseFloat(localStorage.getItem('bgmVolume') || '0.7');
    return isNaN(v) ? 0.7 : Math.max(0, Math.min(1, v));
  };
  const setVol = (v) => {
    const vol = Math.max(0, Math.min(1, Number(v)));
    localStorage.setItem('bgmVolume', String(vol));
    if (window.MediaManager) MediaManager.setVolume(vol);
  };

  // Find the bottom Audio card by locating the SFX slider
  function getBottomAudioPanel(root){
    const sfx = root.querySelector('input[type="range"][id*="sfx" i], input[type="range"][name*="sfx" i]');
    return sfx ? (sfx.closest('.panel, .section, .col, .row, div') || root) : null;
  }

  function wireOnce(){
    const root = document.getElementById('screen-settings');
    if (!root) return;
    const panel = getBottomAudioPanel(root);
    if (!panel) return;

    // 1) Remove Preview / Preview All (forever)
    panel.querySelectorAll('button').forEach(b => {
      const t = (b.textContent || '').toLowerCase().replace(/\s+/g,' ').trim();
      if (t === 'preview' || t === 'preview all') b.remove();
    });

    // 2) MUSIC VOLUME slider (exactly one), right above SFX slider
    let slider = panel.querySelector('#bgm-volume');
    if (!slider) {
      // adopt an existing "music/bgm" slider if present; else create one
      slider =
        panel.querySelector('input[type="range"][id*="music" i]:not([id*="sfx" i])') ||
        panel.querySelector('input[type="range"][name*="music" i]:not([name*="sfx" i])');

      if (!slider) {
        slider = document.createElement('input');
        slider.type = 'range';
        slider.id = 'bgm-volume';
        slider.className = 'range';
        // place just above SFX row
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cssText = 'gap:8px;align-items:center;margin-bottom:6px';
        const label = document.createElement('div');
        label.textContent = 'Music Volume';
        row.append(label, slider);
        const sfx = panel.querySelector('input[type="range"][id*="sfx" i], input[type="range"][name*="sfx" i]');
        const sfxRow = sfx?.closest('.row') || sfx || panel.firstChild;
        panel.insertBefore(row, sfxRow);
      } else {
        slider.id = 'bgm-volume';
      }
    }
    if (!slider.min)  slider.min = '0';
    if (!slider.max)  slider.max = '1';
    if (!slider.step) slider.step = '0.05';
    slider.value = String(getVol());
    setVol(slider.value);
    slider.oninput = () => setVol(slider.value);

    // Remove any other music sliders in this panel so there’s only one
    panel.querySelectorAll('input[type="range"]').forEach(r => {
      if (r === slider) return;
      const idn=(r.id||'').toLowerCase(), nm=(r.name||'').toLowerCase();
      const looksMusic = idn.includes('music') || idn.includes('bgm') || nm.includes('music') || nm.includes('bgm');
      const looksSfx   = idn.includes('sfx')   || nm.includes('sfx');
      if (looksMusic && !looksSfx) r.remove();
    });

    // 3) MUSIC ON/OFF toggle (exactly one).
    // Try to place it where Preview was (end of first row), otherwise put it in the first row of the panel.
    let toggle = panel.querySelector('#music-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'music-toggle';
      toggle.className = 'btn small';
      const firstRow = panel.querySelector('.row') || panel;
      firstRow.appendChild(toggle);
    }
    const paint = () => {
      const muted = getMuted();
      toggle.textContent = muted ? 'Music: Off' : 'Music: On';
      toggle.setAttribute('aria-pressed', (!muted).toString());
    };
    paint();

    // Event delegation so the handler survives re-renders
    if (!panel.dataset.musicDelegated){
      panel.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('#music-toggle');
        if (!btn) return;
        const next = !getMuted();
        setMuted(next);
        paint();
      });
      panel.dataset.musicDelegated = '1';
    }

    // Remove any other leftover "Music:" buttons so there’s only one
    panel.querySelectorAll('button').forEach(b => {
      if (b === toggle) return;
      const t=(b.textContent||'').toLowerCase();
      if (t.startsWith('music:')) b.remove();
    });

    // Respect saved mute every time we wire
    setMuted(getMuted());
  }

  // Run now and on any Settings DOM changes
  const settingsRoot = document.getElementById('screen-settings');
  if (settingsRoot) {
    new MutationObserver(wireOnce).observe(settingsRoot, { childList: true, subtree: true });
  }
  // Run after first paint too, to catch late mounts
  window.requestAnimationFrame(wireOnce);
})();

// Remove the legacy top "Audio" block (keep Appearance)
(function removeLegacyTopAudio(){
  const root = document.getElementById('screen-settings');
  if (!root) return;
  const right = root.querySelector('.grid.cols-2 > .col:nth-child(2)');
  if (!right) return;
  const h3s = Array.from(right.querySelectorAll('h3'));
  const audioH3 = h3s.find(h=>/audio/i.test(h.textContent||''));
  const appearanceH3 = h3s.find(h=>/appearance/i.test(h.textContent||''));
  if (!audioH3) return;
  let n = audioH3;
  while (n && n !== appearanceH3) { const next = n.nextElementSibling; n.remove(); n = next; }
})();
