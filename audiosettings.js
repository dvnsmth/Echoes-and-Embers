// ===== audiosettings.js (clean UI, no mute checkbox) =====

export const AudioSettings = {
  _cfg: { bgm:null, sfx:{} },
  _bgmEl: null,

  init(cfg){
    this._cfg = Object.assign({ bgm:null, sfx:{} }, cfg || {});

    // Prepare or reuse hidden BGM element
    if (this._cfg.bgm) {
      const existing = document.getElementById('bgm');
      const a = (existing && existing.tagName==='AUDIO') ? existing : new Audio(this._cfg.bgm);
      a.preload='auto'; a.loop=true; a.style.display='none';
      if (!existing) document.body.appendChild(a);
      this._bgmEl = a;

      a.muted  = localStorage.getItem('bgmMuted') === 'true';
      const savedBgm = Number(localStorage.getItem('bgmVolume'));
      a.volume = Number.isFinite(savedBgm) ? savedBgm : 0.7;

      a.play().catch(()=>{
        const unlock = () => {
          a.play().finally(()=>{
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
          });
        };
        document.addEventListener('click', unlock, { once:true });
        document.addEventListener('touchstart', unlock, { once:true });
      });
    }
  },

  mount(container){
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'settings-group';
    section.innerHTML = `
      <div class="card" style="padding:1rem; border:1px solid var(--border,#ddd); border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.05);">
        <div class="row" style="justify-content:space-between; align-items:center; gap:.75rem; flex-wrap:wrap;">
          <h3 style="margin:0;">Audio</h3>
          <button id="as-music-toggle" class="btn">🔇 Music: Off</button>
        </div>

        <div class="row" style="gap:1rem; align-items:center; margin-top:1rem;">
          <label style="min-width:8rem; font-weight:600;">Music Volume</label>
          <input id="as-music-volume" type="range" min="0" max="1" step="0.01" value="0.7" style="flex:1" />
          <span id="as-music-volume-value" class="badge">70%</span>
          <button id="as-test-bgm" class="btn ghost">Preview</button>
        </div>

        <div class="row" style="gap:1rem; align-items:center; margin-top:1rem;">
          <label style="min-width:8rem; font-weight:600;">SFX Volume</label>
          <input id="as-sfx-volume" type="range" min="0" max="1" step="0.01" value="0.8" style="flex:1" />
          <span id="as-sfx-volume-value" class="badge">80%</span>
          <button id="as-play-all" class="btn ghost">Preview All</button>
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

    const sync = () => {
      if (this._bgmEl) {
        mv.value = String(this._bgmEl.volume);
        mvVal.textContent = fmt(this._bgmEl.volume);
        const on = !this._bgmEl.paused && !this._bgmEl.muted;
        toggle.textContent = on ? '🔊 Music: On' : '🔇 Music: Off';
      }
      const savedSfx = Number(localStorage.getItem('sfxVolume'));
      const current = Number.isFinite(savedSfx) ? savedSfx : 0.8;
      sv.value = String(current);
      svVal.textContent = fmt(current);
    };

    if (this._bgmEl) {
      this._bgmEl.addEventListener('play', sync);
      this._bgmEl.addEventListener('pause', sync);
      this._bgmEl.addEventListener('volumechange', sync);
    }

    toggle.addEventListener('click', () => {
      if (!this._bgmEl) return;
      const next = !this._bgmEl.muted;
      this._bgmEl.muted = next;
      localStorage.setItem('bgmMuted', String(next));
      if (!next && this._bgmEl.paused) this._bgmEl.play().catch(()=>{});
      sync();
    });

    mv.addEventListener('input', () => {
      if (!this._bgmEl) return;
      const v = Number(mv.value);
      if (Number.isFinite(v)) {
        this._bgmEl.volume = v;
        localStorage.setItem('bgmVolume', String(v));
        mvVal.textContent = fmt(v);
        sync();
      }
    });

    sv.addEventListener('input', () => {
      const v = Number(sv.value);
      if (Number.isFinite(v) && window.AudioManager && typeof window.AudioManager.setVolume === 'function') {
        window.AudioManager.setVolume(v);
        localStorage.setItem('sfxVolume', String(v));
        svVal.textContent = fmt(v);
      }
    });

    section.querySelector('#as-test-bgm')?.addEventListener('click', () => {
      if (!this._bgmEl) return;
      this._bgmEl.muted = false; localStorage.setItem('bgmMuted','false');
      this._bgmEl.play().catch(()=>{});
      sync();
    });

    section.querySelector('#as-play-all')?.addEventListener('click', async () => {
      for (const k of sfxKeys) { try { window.AudioManager?.play(k); } catch{} await new Promise(r=>setTimeout(r,200)); }
    });

    sync();
  }
};
