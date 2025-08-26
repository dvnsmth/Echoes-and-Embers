// scripts/systems/state.js
// Global game state + lightweight notifier + user settings.
// NOTE: Inventory is an array; systems/inventory.js will auto-migrate legacy shapes.

export const State = {
  version: 1,
  party: [],
  gold: 20,
  inventory: [],          // ← array [{name:id, qty:n}]
  quests: {},
  flags: {},
  region: "Thornbridge",
  // Optional XP curve; UI falls back to this if present
  xpCurve: [0, 50, 125, 225, 350, 500, 700, 950, 1250, 1600, 2000]
};

export const Notifier = {
  toast:   (msg) => console.log("[toast]", msg),
  goto:    (id)  => console.log("[goto]", id),
  refresh: ()    => {}
};

export const Settings = {
  key: "hollowvale-settings",
  data: { textSize: 16, theme: "dark", muted: false, reduced: false },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) this.data = Object.assign(this.data, JSON.parse(raw));
    } catch {}
    this.apply();
  },
  save() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
    Notifier.toast?.("Settings saved.");
  },
  apply() {
    document.documentElement.style.fontSize = (this.data.textSize || 16) + "px";
    if (this.data.theme === "light") document.body.classList.add("light");
    else document.body.classList.remove("light");
    document.documentElement.style.setProperty("--reduced", this.data.reduced ? "1" : "0");
  },
  reset() {
    this.data = { textSize: 16, theme: "dark", muted: false, reduced: false };
    this.apply();
  }
};
Settings.load();