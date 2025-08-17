// ===== audiosettings.js (MediaManager-driven; no Preview buttons) =====
export const AudioSettings = {
  _cfg: { sfx:{} },

  init(cfg){
    this._cfg = Object.assign({ sfx:{} }, cfg || {});
  },

  mount(container){
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'settings-group';
    section.innerHTML = `
      <div class="card" style="padding:1rem; border:1px solid var(--border,#ddd); border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.05);">
        <div class="row" style="justify-content:space-between; align-items:center; gap:.75rem; flex-wrap:wrap;">
          <h3 style="margin:0;">Audio</h3>
          <button id="as-music-toggle" class="btn small">Music: Off</button>
        </div>

        <div class="row" style="gap:1rem; align-items:center; margin-top:1rem;">
          <label style="min-width:8rem; font-weight:600;">Music Volume</label>
          <input id="as-music-volume" type="range" min="0" max="1" step="0.01" value="0.7" style="flex:1" />
          <span id="as-music-volume-value" class="badge">70%</span>
        </div>

        <div class="row" style="gap:1rem; align-items:center; margin-top:1rem;">
          <label style="min-width:8rem; font-weight:600;">SFX Volume</label>
          <input id="as-sfx-volume" type="range" min="0" max="1" step="0.01" value="0.8" style="flex:1" />
          <span id="as-sfx-volume-value" class="badge">80%</span>
        </div>

        <div class="grid" id="as-sfx-buttons" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px,1fr)); gap:.5rem; margin-top:1rem;"></div>
      </div>
    `;
    container.appendChild(section);

    // Build SFX test buttons from provided map
    const sfxWrap = section.querySelector('#as-sfx-buttons');
    const sfxKeys = Object.keys(this._cfg.sfx||{});
    sfxKeys.forEach(k=>{
      const b = document.createElement('button');
      b.className='btn ghost'; b.textContent=k;
      b.addEventListener('click',()=>{ try{ window.AudioManager?.play(k); }catch{} });
      sfxWrap.appendChild(b);
    });

    const fmt = v=>`${Math.round((Number(v)||0)*100)}%`;
    const mv = section.querySelector('#as-music-volume');
    const sv = section.querySelector('#as-sfx-volume');
    const mvVal = section.querySelector('#as-music-volume-value');
    const svVal = section.querySelector('#as-sfx-volume-value');
    const toggle = section.querySelector('#as-music-toggle');

    const getMuted  = () => localStorage.getItem('bgmMuted') === 'true';
    const setMuted  = f => { localStorage.setItem('bgmMuted', String(!!f)); window.MediaManager?.mute(!!f); };
    const getVolume = () => { const v = parseFloat(localStorage.getItem('bgmVolume')||'0.7'); return isNaN(v)?0.7:Math.max(0,Math.min(1,v)); };
    const setVolume = v => { const vol = Math.max(0,Math.min(1,Number(v))); localStorage.setItem('bgmVolume', String(vol)); window.MediaManager?.setVolume(vol); };

    const sync = () => {
      mv.value = String(getVolume());
      mvVal.textContent = fmt(mv.value);
      const on = !getMuted();
      toggle.textContent = on ? 'Music: On' : 'Music: Off';
      toggle.setAttribute('aria-pressed', on.toString());

      const savedSfx = Number(localStorage.getItem('sfxVolume'));
      const sfxCur = Number.isFinite(savedSfx) ? savedSfx : 0.8;
      sv.value = String(sfxCur);
      svVal.textContent = fmt(sfxCur);
    };

    // ✅ FIXED: toggle actually flips mute state
    toggle.addEventListener('click', () => {
      const next = !getMuted();   // what we want the new state to be (true means muted)
      setMuted(next);             // apply it
      sync();                     // repaint label
    });

    mv.addEventListener('input', () => {
      const v = Number(mv.value);
      if (Number.isFinite(v)) { setVolume(v); mvVal.textContent = fmt(v); }
    });

    sv.addEventListener('input', () => {
      const v = Number(sv.value);
      if (Number.isFinite(v) && window.AudioManager?.setVolume) {
        window.AudioManager.setVolume(v);
        localStorage.setItem('sfxVolume', String(v));
        svVal.textContent = fmt(v);
      }
    });

    // Initial paint
    sync();
  }
};
