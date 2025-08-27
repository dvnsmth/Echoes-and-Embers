// scripts/ui/startmenu.js — drop-in, no imports needed

// tiny router that prefers your UI.goto, with fallbacks
function go(id) {
  try { if (window.UI?.goto) return window.UI.goto(id); } catch {}
  // Fallbacks: click any tab-like control if present
  const el =
    document.querySelector(`[data-tab="${id}"]`) ||
    document.querySelector(`#tab-${id}`) ||
    document.querySelector(`[data-target="${id}"]`) ||
    document.querySelector(`#${id}-tab`) ||
    document.querySelector(`#${id}`);
  el?.click?.();
}

// unlock audio on first gesture; safe even if you don't use AudioManager
async function unlockAudio() {
  try { await window.AudioManager?.init?.(); } catch {}
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      await ctx.resume();
      const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * 0.01), ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {}
}

export const StartMenu = {
  el: null,
  btnNew: null,
  btnCont: null,
  btnSettings: null,
  _trapHandler: null,
  _keyBlocker: null,
  _returnBtn: null,

  init() {
    this.el = document.getElementById('start-overlay');
    if (!this.el) return;

    this.btnNew      = document.getElementById('btn-newgame');
    this.btnCont     = document.getElementById('btn-continue');
    this.btnSettings = document.getElementById('btn-settings');

    // show Continue if a save key exists
    try {
      const keys = Object.keys(localStorage);
      const hasSave = keys.some(k => /save/i.test(k) || /game:save/i.test(k) || /echoes.*save/i.test(k));
      if (hasSave && this.btnCont) this.btnCont.hidden = false;
    } catch {}

    this.btnNew?.addEventListener('click', () => this.startNew());
    this.btnCont?.addEventListener('click', () => this.continueGame());
    this.btnSettings?.addEventListener('click', () => this.openSettings());

    // lock escape/backdrop
    this._keyBlocker = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } };
    document.addEventListener('keydown', this._keyBlocker, true);
    this.el.addEventListener('click', (e) => { if (e.target === this.el) { e.preventDefault(); e.stopPropagation(); } });

    // focus trap
    const focusables = () => Array.from(this.el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    this._trapHandler = (e) => {
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', this._trapHandler, true);

    (this.btnNew || this.btnCont || this.btnSettings)?.focus();
    document.body.style.overflow = 'hidden';
  },

  async startNew() {
    await unlockAudio();
    try { window.MediaManager?.setInitialMusic?.(["Assets/audio/Music/That Zen Moment.mp3"]); } catch {}
    this.close();
    go('create'); 
  },

  async continueGame() {
    await unlockAudio();
    try { window.MediaManager?.setInitialMusic?.(["Assets/audio/Music/That Zen Moment.mp3"]); } catch {}

    this.close();
    const last = localStorage.getItem('ui:lastTab') || localStorage.getItem('lastActiveTab');
    go(last || 'menu');
  },

  openSettings() {
    go('settings');
    this.el.style.display = 'none';

    setTimeout(() => {
      const root =
        document.getElementById('screen-settings') ||
        document.querySelector('#screen-settings, [data-tab="settings"]') ||
        document.body;

      if (this._returnBtn && document.body.contains(this._returnBtn)) return;

      const btn = document.createElement('button');
      btn.textContent = '⬅ Back to Start';
      btn.id = 'back-to-start';
      btn.style.cssText = `
        position: sticky; top: 8px; z-index: 50; margin: 0 0 12px 0;
        padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12);
        background: transparent; color: inherit; font: inherit; cursor: pointer;
      `;
      btn.addEventListener('click', () => this.returnFromSettings());
      root.prepend(btn);
      this._returnBtn = btn;
    }, 0);
  },

  returnFromSettings() {
    if (this._returnBtn) { this._returnBtn.remove(); this._returnBtn = null; }
    this.el.style.display = '';
    (this.btnNew || this.btnCont || this.btnSettings)?.focus();
  },

  close() {
    document.removeEventListener('keydown', this._trapHandler, true);
    document.removeEventListener('keydown', this._keyBlocker, true);
    document.body.style.overflow = '';
    this.el.remove();
    if (this._returnBtn) { this._returnBtn.remove(); this._returnBtn = null; }
  }
};
