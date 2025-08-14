// ===== audio.js (MP3-only) =====
// Accepts either { key: 'path.mp3' } or { key: { mp3: 'path.mp3' } }

class SimpleAudioManager {
  constructor(){
    this._bank = new Map();      // name -> prototype <audio>
    this._volume = 0.8;
    this._last = new Map();
    this._minGap = 30;
  }

  setVolume(v){
    const n = Number(v);
    if (Number.isFinite(n)) this._volume = Math.max(0, Math.min(1, n));
  }

  load(defs){
    Object.entries(defs || {}).forEach(([name, def]) => {
      try {
        const src = (typeof def === 'string') ? def : (def && def.mp3);
        if (!src) return;
        const proto = new Audio(src);
        proto.preload = 'auto';
        this._bank.set(name, proto);
      } catch {}
    });
  }

  play(name){
    const proto = this._bank.get(name);
    if (!proto) return;
    const now = performance.now();
    const last = this._last.get(name) || 0;
    if (now - last < this._minGap) return;
    this._last.set(name, now);
    try {
      const a = proto.cloneNode(true);
      a.volume = this._volume;
      a.play().catch(()=>{});
    } catch {}
  }
}

export const AudioManager = new SimpleAudioManager();
