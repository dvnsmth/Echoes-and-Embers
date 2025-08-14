// ===== main.js (MP3-only, no global click) =====

import { UI, SettingsUI } from './ui.js';
import { Settings } from './state.js';
import { StartMenu } from './startMenu.js'; // matches your existing filename
import { Scenes, Dialogue } from './scenes.js';
import { Combat } from './combat.js';
import { Sheet } from './sheet.js';
import { AudioManager } from './audio.js';
import { AudioSettings } from './audiosettings.js';

// Expose for console debugging
Object.assign(window, { UI, SettingsUI, Scenes, Dialogue, Combat, Sheet, Settings, AudioManager });

// ---- Config ----
const BGM_SRC = 'Assets/Music/ourlordisnotready.mp3';

// MP3-only SFX map (no 'click')
const SFX_MAP = {
  select:  'Assets/SFX/computer click.mp3',
  hit:     'Assets/SFX/sword hit.mp3',
  heal:    'Assets/SFX/healing.mp3',
  victory: 'Assets/SFX/victory.mp3',
  defeat:  'Assets/SFX/game over.mp3',
  item:    'Assets/SFX/potion use.mp3'
};
window.SFX_MAP = SFX_MAP;

// LocalStorage keys
const LS = { bgmVolume:'bgmVolume', sfxVolume:'sfxVolume', bgmMuted:'bgmMuted' };
const num = (k,f)=>{ const n=Number(localStorage.getItem(k)); return Number.isFinite(n)?n:f; };

// Hide legacy 'Mute sounds' block so only new Audio panel shows
function hideLegacyAudioBlock(){
  const legacyInput = document.getElementById('set-mute');
  if (!legacyInput) return;
  const col = legacyInput.closest('.col');
  if (col) col.style.display = 'none';
}

// ---- Background Music ----
let backgroundMusic = null;
window.backgroundMusic = null;

function getBgmElement(){
  const el = document.getElementById('bgm');
  if (el && el.tagName === 'AUDIO') {
    if (!el.src) el.src = BGM_SRC;
    return el;
  }
  const a = new Audio(BGM_SRC);
  a.preload = 'auto';
  a.loop = true;
  a.style.display = 'none';
  document.body.appendChild(a);
  return a;
}

function initBackgroundMusic(){
  backgroundMusic = getBgmElement();
  window.backgroundMusic = backgroundMusic;

  backgroundMusic.muted  = localStorage.getItem(LS.bgmMuted) === 'true';
  backgroundMusic.volume = num(LS.bgmVolume, 0.7);

  // Autoplay unlock
  backgroundMusic.play().catch(()=>{
    const unlock = () => {
      backgroundMusic.play().finally(()=>{
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
      });
    };
    document.addEventListener('click', unlock, { once:true });
    document.addEventListener('touchstart', unlock, { once:true });
  });

  // Optional header toggle button
  const btn = document.getElementById('music-toggle');
  const setBtnLabel = () => {
    if (!btn) return;
    const on = backgroundMusic && !backgroundMusic.paused && !backgroundMusic.muted;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '🔊 Music: On' : '🔇 Music: Off';
  };
  if (btn) {
    btn.addEventListener('click', () => {
      const nextMuted = !backgroundMusic.muted;
      backgroundMusic.muted = nextMuted;
      localStorage.setItem(LS.bgmMuted, String(nextMuted));
      if (!nextMuted && backgroundMusic.paused) { try { backgroundMusic.play(); } catch {} }
      setBtnLabel();
    });
  }
  backgroundMusic.addEventListener('play', setBtnLabel);
  backgroundMusic.addEventListener('pause', setBtnLabel);
  backgroundMusic.addEventListener('volumechange', setBtnLabel);
  setBtnLabel();
}

// ---- SFX (MP3-only) ----
function initSfx(){
  AudioManager.load(SFX_MAP);
  const v = num(LS.sfxVolume, 0.8);
  AudioManager.setVolume(v);
}

// ---- Boot ----
window.addEventListener('DOMContentLoaded', () => {
  UI.init?.();
  Settings.load?.();
  SettingsUI.init?.();
  StartMenu.init?.();

  initBackgroundMusic();
  initSfx();
  hideLegacyAudioBlock();

  // Mount the modern Audio panel inside Settings
  AudioSettings.init({ bgm: BGM_SRC, sfx: SFX_MAP });
  const settingsRoot = document.getElementById('screen-settings');
  AudioSettings.mount(settingsRoot);
});
