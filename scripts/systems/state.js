// scripts/systems/state.js
// Global game state + lightweight notifier + user settings.
// Strict model: inventory = [{ id, qty }], characters use `equipment`.

export const State = {
  version: 2,
  party: [],
  gold: 20,
  inventory: [],          // [{ id: "iron_sword", qty: 1 }]
  quests: {},             // { [questId]: { id,name,stage,status,... } }
  flags: {},              // misc booleans (e.g., { light:true })
  region: "Thornbridge",
  xpCurve: [0, 50, 125, 225, 350, 500, 700, 950, 1250, 1600, 2000],
};

export const Notifier = {
  toast:   (msg) => console.log("[toast]", msg),
  goto:    (id)  => console.log("[goto]", id),
  refresh: ()    => {},
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
  },
};

export default State;
