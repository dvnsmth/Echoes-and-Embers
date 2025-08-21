// audiosettings.js — SFX Test Buttons ONLY (no music UI here)
import { AudioManager } from './audio.js';

export const AudioSettings = {
  _sfxMap: {},

  // Pass in your SFX map from main.js: AudioSettings.init({ sfx: SFX_MAP })
  init(opts){
    this._sfxMap = (opts && opts.sfx) ? opts.sfx : {};
  },

  // Mount under the Settings screen. We only add a row of "Test <key>" buttons.
  mount(root){
    if (!root) return;

    // Prefer the right-hand Audio column in Settings, fall back to root
    const target =
      root.querySelector('.grid.cols-2 > .col:nth-child(2)') ||
      root;

    // Avoid duplicates if this function is called multiple times
    const existing = target.querySelector('[data-sfx-tests="1"]');
    if (existing) return;

    // Wrapper row
    const wrap = document.createElement('div');
    wrap.className = 'row';
    wrap.dataset.sfxTests = '1';
    wrap.style.gap = '8px';
    wrap.style.flexWrap = 'wrap';
    wrap.style.marginTop = '8px';

    const keys = Object.keys(this._sfxMap || {});
    if (!keys.length){
      const hint = document.createElement('span');
      hint.className = 'tag';
      hint.textContent = 'No SFX loaded.';
      wrap.appendChild(hint);
      target.appendChild(wrap);
      return;
    }

    // (Optional) "Preview All" button first
    const allBtn = document.createElement('button');
    allBtn.className = 'btn small';
    allBtn.textContent = 'Preview All';
    allBtn.title = 'Play each loaded SFX once';
    allBtn.onclick = async () => {
      for (const k of keys){
        try { AudioManager.play(k); } catch {}
        await new Promise(r => setTimeout(r, 180)); // small stagger
      }
    };
    wrap.appendChild(allBtn);

    // One small "Test" button per SFX key
    for (const key of keys){
      const btn = document.createElement('button');
      btn.className = 'btn small';
      btn.textContent = `Test ${key}`;
      btn.title = `Play "${key}" sound`;
      btn.onclick = () => { try { AudioManager.play(key); } catch {} };
      wrap.appendChild(btn);
    }

    target.appendChild(wrap);
  }
};
