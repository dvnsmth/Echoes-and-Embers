// scripts/ui/ui.js — UI shell (no DB usage)
// Uses import-map aliases (data/*, systems/*)

import { Settings, State, Notifier } from "../systems/state.js";
import { Storage } from "../systems/storage.js";
import { createCharacter } from "../systems/character.js";
import { startingStats } from "../data/stats.js";
import { races } from "../data/race.js";
import { classes } from "../data/class.js";
import {
  listInventory,
  useItem,
  removeItem
} from "../systems/inventory.js";

// Optional Settings sub-UI lives in this file (exported at bottom)
export const UI = {
  tabs: [
    // { id: "menu",      label: "🏠 Menu" },
    { id: "create",    label: "🧙 Party" },
    { id: "town",      label: "🏘️ Town" },
    { id: "sheet",     label: "📜 Sheets" },
    { id: "inventory", label: "🎒 Inventory" },
  ],

  // --- Party gating helpers ---
  isPartyReady() {
    return (State.party?.length || 0) > 0;  // change to >= 4 if you want full party required
  },

lockNav(locked) {
  // Header buttons
  ["btnSave","btnLoad","btnReset"].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.disabled = !!locked;
  });

  // Tabs: disable everything except "create" while locked
  const tb = document.getElementById("tabbar");
  if (tb) {
    const btns = tb.querySelectorAll("button");
    btns.forEach((b, idx) => {
      const t = UI.tabs[idx];
      if (!t) return;
   b.disabled = !!locked && !(t.id === "create" || t.id === "settings");
    });
  }

  // Disable the "Enter Town" button on the Party screen
  const enter = document.getElementById("btnEnterTown");
  if (enter) enter.disabled = !!locked;

  // Disable the quest chip so it can't send you to Town
  const chip = document.getElementById("quest-chip");
  if (chip) {
    if (locked) {
      chip.onclick = null;
      chip.setAttribute("aria-disabled","true");
      chip.style.pointerEvents = "none";
      chip.style.opacity = "0.6";
    } else {
      chip.onclick = () => UI.goto("town");
      chip.removeAttribute("aria-disabled");
      chip.style.pointerEvents = "";
      chip.style.opacity = "";
    }
  }
},

  init() {
    // Bridge Notifier to concrete UI functions
    Notifier.toast   = (msg) => UI.toast(msg);
    Notifier.goto    = (id)  => UI.goto(id);
    Notifier.refresh = () => {
      UI.refreshSheet();
      UI.refreshParty();
      UI.refreshQuestChip();
      if (isActive("inventory")) UI.refreshInventory();
    };

    // Tabs + Quest tracker chip
    const tb = document.getElementById("tabbar");
    if (tb) {
      tb.innerHTML = "";
      this.tabs.forEach(t => {
        const b = document.createElement("button");
        b.className = "btn ghost";
        b.textContent = t.label;
        b.onclick = () => UI.goto(t.id);
        tb.appendChild(b);
      });
      const spacer = document.createElement("div");
      spacer.style.flex = "1";
      const chip = document.createElement("div");
      chip.className = "pill";
      chip.id = "quest-chip";
      chip.style.cursor = "pointer";
      chip.title = "Active quest";
      chip.textContent = "No active quest";
      chip.onclick = () => UI.goto("town");
      tb.appendChild(spacer);
      tb.appendChild(chip);
    }

    // Character Creator dropdowns (from data files)
    const selRace  = document.getElementById("cc-race");
    const selClass = document.getElementById("cc-class");
    if (selRace) {
      selRace.innerHTML = Object.keys(races)
        .map(key => {
          const r = races[key];
          const label = r?.name || key;
          return `<option value="${key}">${label}</option>`;
        })
        .join("");
    }
    if (selClass) {
      selClass.innerHTML = Object.keys(classes)
        .map(key => {
          const c = classes[key];
          const label = c?.name || key;
          return `<option value="${key}">${label}</option>`;
        })
        .join("");
    }

    UI.resetAllocator();
    const addBtn = document.getElementById("cc-add");
    if (addBtn) addBtn.onclick = UI.addCharacter;
    const newBtn = document.getElementById("cc-new");
    if (newBtn) newBtn.onclick = UI.newCharacter;
    const demoBtn = document.getElementById("cc-load-demo");
if (demoBtn) demoBtn.onclick = UI.loadDemoParty;

// Optional: if you want Enter Town disabled until party > 0
const enterBtn = document.getElementById("btnEnterTown");
if (enterBtn) enterBtn.disabled = !((State.party?.length || 0) > 0);


    UI.refreshParty();
    UI.refreshSheet();
    UI.refreshQuestChip();

    // Header buttons
    const btnSave  = document.getElementById("btnSave");
    const btnLoad  = document.getElementById("btnLoad");
    const btnReset = document.getElementById("btnReset");
    btnSave  && (btnSave.onclick  = Storage.save);
    btnLoad  && (btnLoad.onclick  = Storage.load);
    btnReset && (btnReset.onclick = () => {
      if (confirm("Reset game?")) {
        localStorage.removeItem("hollowvale-save");
        location.reload();
      }
    });

    // Open Settings screen from the header
    const btnSettings = document.getElementById("btnSettings");
    if (btnSettings) btnSettings.onclick = () => UI.goto("settings");

    // Initialize Settings UI handlers (safe to call once)
    SettingsUI.init?.();
        // Lock navigation until the party is ready
    UI.lockNav(!UI.isPartyReady());
  },

goto(id) {
  // Hard gate: allow Settings anytime; block others until party exists
  if (!UI.isPartyReady() && !(id === "create" || id === "settings")) {
    UI.toast("Finish creating your party first.");
    return;
  }

  // Are we already on this screen?
  const current = document.querySelector(".screen.active");
  const sameScreen =
    current && (current.id === `screen-${id}` || current.id === id);

  // Only toggle .active classes if we're switching screens
  if (!sameScreen) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const screenEl = document.getElementById(`screen-${id}`) || document.getElementById(id);
    if (screenEl) screenEl.classList.add("active");
  }

  // Highlight the active tab (do this always)
  const tb = document.getElementById("tabbar");
  if (tb) {
    document.querySelectorAll("#tabbar button").forEach(b => b.classList.remove("active"));
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx >= 0) {
      const btn = tb.querySelectorAll("button")[idx];
      if (btn) btn.classList.add("active");
    }
  }

  // ✅ Update hero art / music even if we were already on this screen
  if (id === "menu")      window.setLocationMedia?.("Menu");
  if (id === "create")    window.setLocationMedia?.("CreateParty");
  if (id === "sheet")     window.setLocationMedia?.("Sheet");
  if (id === "inventory") window.setLocationMedia?.("Inventory");

  // Route side-effects (safe to run when sameScreen too)
  if (id === "town")      { window.townSquare?.(); }
  if (id === "sheet")     { UI.refreshSheet(); }
  if (id === "settings")  { window.SettingsUI?.syncForm?.(); }
  if (id === "inventory") { UI.refreshInventory(); }
},

  toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), (window.Settings?.data?.reduced) ? 1200 : 2200);
  },

  // ===== Character Creator (12 pts, 10–60 band) =====
  resetAllocator() {
    UI.alloc = { points: 12, stats: startingStats() }; // {STR,DEX,CON,INT,WIS,LCK} all 12
    const wrap = document.getElementById("cc-stats");
    if (!wrap) return;
    wrap.innerHTML = "";

    const keys = ["STR", "DEX", "CON", "INT", "WIS", "LCK"];
    keys.forEach(k => {
      const row = document.createElement("div");
      row.className = "stat";
      row.innerHTML = `
        <strong>${k}</strong>
        <div class="row">
          <button class="btn small">−</button>
          <span id="cc_${k}">${UI.alloc.stats[k]}</span>
          <button class="btn small">＋</button>
        </div>`;
      const [minus, , plus] = row.querySelectorAll("button,span");
      minus.onclick = () => {
        if (UI.alloc.stats[k] > 10) {
          UI.alloc.stats[k]--; UI.alloc.points++; UI.updateAlloc();
        }
      };
      plus.onclick = () => {
        if (UI.alloc.points > 0 && UI.alloc.stats[k] < 60) {
          UI.alloc.stats[k]++; UI.alloc.points--; UI.updateAlloc();
        }
      };
      wrap.appendChild(row);
    });
    UI.updateAlloc();
  },

  updateAlloc() {
    ["STR","DEX","CON","INT","WIS","LCK"].forEach(k => {
      const el = document.getElementById(`cc_${k}`); if (el) el.textContent = UI.alloc.stats[k];
    });
    const pts = document.getElementById("cc-points");
    if (pts) pts.textContent = UI.alloc.points;
  },

  addCharacter() {
    if ((State.party?.length || 0) >= 4) return UI.toast("Party is full.");
    const name  = (document.getElementById("cc-name").value || "").trim() || `Adventurer ${(State.party?.length || 0) + 1}`;
    const race  = document.getElementById("cc-race").value;
    const clazz = document.getElementById("cc-class").value;
    const bg    = (document.getElementById("cc-bg").value || "").trim();

    const ch = createCharacter({ name, race, clazz, bg, stats: structuredClone(UI.alloc.stats) });
    State.party = Array.isArray(State.party) ? State.party : [];
    State.party.push(ch);
    UI.refreshParty(); UI.refreshSheet(); UI.toast(`${ch.name} joined the party.`);
    UI.lockNav(!UI.isPartyReady());   // <--- unlocks nav once a character exists
  },

  newCharacter() {
    UI.resetAllocator();
    const nameEl  = document.getElementById("cc-name");
    const bgEl    = document.getElementById("cc-bg");
    const raceEl  = document.getElementById("cc-race");
    const classEl = document.getElementById("cc-class");
    if (nameEl)  nameEl.value = "";
    if (bgEl)    bgEl.value = "";
    if (raceEl)  raceEl.selectedIndex  = 0;
    if (classEl) classEl.selectedIndex = 0;
    UI.toast("Character form reset.");
    
  },

  loadDemoParty() {
  // Create 3 sample heroes using your existing creator (keeps derived stats consistent)
  const demo = [
    createCharacter({
      name: "Arin",
      race: "Human",
      clazz: "Warrior",
      bg: "Veteran",
      stats: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 11, LCK: 10 }
    }),
    createCharacter({
      name: "Lira",
      race: "Elf",
      clazz: "Wizard",
      bg: "Scholar",
      stats: { STR: 10, DEX: 12, CON: 11, INT: 17, WIS: 14, LCK: 10 }
    }),
    createCharacter({
      name: "Korin",
      race: "Dwarf",
      clazz: "Cleric",
      bg: "Acolyte",
      stats: { STR: 12, DEX: 10, CON: 15, INT: 11, WIS: 16, LCK: 9 }
    }),
  ];

  // Replace party (cap at 4 if needed)
  State.party = demo.slice(0, 4);

  // Recompute lock state now that a party exists
  UI.lockNav(!UI.isPartyReady());

  // Enable Enter Town if present (redundant but safe)
  const enterBtn = document.getElementById("btnEnterTown");
  if (enterBtn) enterBtn.disabled = (State.party.length === 0);

  // Refresh UI
  UI.refreshParty();
  UI.refreshSheet();
  UI.toast("Sample party loaded!");
},

  // ===== Party panel =====
  refreshParty() {
    const list = document.getElementById("party-list");
    if (!list) return;
    list.innerHTML = "";
    (State.party || []).forEach(ch => {
      const card = document.createElement("div");
      card.className = "panel section";
      card.innerHTML = `
        <div class="row" style="gap:8px;align-items:center">
          <div class="avatar">${UI.classEmoji(ch.clazz)}</div>
          <div class="col" style="gap:2px">
            <strong>${ch.name}</strong>
            <span class="tag">${ch.race} ${ch.clazz} • Lv ${ch.level} • HP ${ch.hp}/${ch.maxHP} • Unspent ${ch.unspent ?? 0}</span>
            <div class="xp-bar"><div style="width:${UI.xpPct(ch)}%"></div></div>
          </div>
          <div class="spacer"></div>
          <button class="btn small" onclick="UI.removeChar('${ch.id}')">Remove</button>
        </div>
      `;
      list.appendChild(card);
    });
    const pc = document.getElementById("party-count");
    if (pc) pc.textContent = `${(State.party?.length || 0)} / 4`;
  },

  // XP percent without DB.xpCurve; uses State.xpCurve or fallback
  xpPct(ch) {
    const curve = Array.isArray(State.xpCurve) ? State.xpCurve
      : [0, 50, 125, 225, 350, 500, 700, 950, 1250, 1600, 2000];
    const L = Math.max(1, Number(ch.level || 1));
    const a = curve[L] ?? 0;
    const b = curve[L + 1] ?? (a + 1);
    const cur = Number(ch.xp || 0);
    const pct = (cur - a) / Math.max(1, (b - a));
    return Math.max(0, Math.min(100, Math.floor(pct * 100)));
  },

  removeChar(id) {
    State.party = (State.party || []).filter(c => c.id !== id);
    UI.refreshParty(); UI.refreshSheet();
  },

  backFromDialogue() {
    const back = UI._dlgBack || "town";
    UI.goto(back);
  },

  classEmoji(cls) {
    return { Warrior: "🛡️", Ranger: "🏹", Rogue: "🗡️", Wizard: "🪄", Cleric: "⛨", Bard: "🎻" }[cls] || "🧭";
  },

  // ===== Sheets panel =====
  refreshSheet() {
    const wrap = document.getElementById("sheet-list");
    if (!wrap) return;

    // Inventory summary
    const inv = listInventory();
    const totalCount = inv.reduce((s, e) => s + (e.qty | 0), 0);
    wrap.innerHTML = `
      <div class="row">
        <div class="pill">💰 <b>${State.gold || 0}</b> gold</div>
        <div class="pill">🎒 Items: ${totalCount}</div>
      </div>`;

    (State.party || []).forEach(ch => {
      // Abilities from classes data
      const abilityList = (classes?.[ch.clazz]?.abilities || [])
        .filter(a => (a.lvl ?? 1) <= (ch.level ?? 1))
        .map(a => a.name)
        .join(", ");

      const d = ch.getDerived ? ch.getDerived() : null;
      const c = document.createElement("div");
      c.className = "panel section";

      c.innerHTML = `
        <div class="row" style="gap:8px">
          <div class="avatar">${UI.classEmoji(ch.clazz)}</div>
          <div class="col" style="gap:2px">
            <strong>${ch.name}</strong>
            <span class="tag">${ch.race} ${ch.clazz} • Lv ${ch.level} • XP ${ch.xp ?? 0} • Unspent ${ch.unspent ?? 0}</span>
          </div>
          <div class="spacer"></div>
          <div class="pill">HP ${ch.hp}/${ch.maxHP}</div>
        </div>

        <div class="grid cols-3" style="margin-top:6px">
          ${["STR","DEX","CON","INT","WIS","LCK"].map(k => `
            <div class="stat"><b>${k}</b><span>${ch.stats?.[k] ?? 10}</span></div>
          `).join("")}
        </div>

        ${d ? `
        <div class="row" style="margin-top:6px;gap:8px;flex-wrap:wrap">
          <div class="pill">PAtk ${d.PAtk}</div>
          <div class="pill">MAtk ${d.MAtk}</div>
          <div class="pill">DEF ${d.DEF}</div>
          <div class="pill">RES ${d.RES}</div>
          <div class="pill">Crit ${d.critPct}%</div>
          <div class="pill">Turn ${d.atbSec}s</div>
        </div>` : ""}

        <p class="tag" style="margin-top:6px">Abilities: ${abilityList || "—"}</p>
        <div class="row" style="margin-top:8px">
          <button class="btn small" onclick="Sheet?.useTonic?.('${ch.id}')">Use Minor Tonic</button>
          <button class="btn small" onclick="Sheet?.equip?.('${ch.id}')">Equip Basic Gear</button>
        </div>
      `;
      wrap.appendChild(c);
    });
  },

  // ===== Inventory screen (data-driven) =====
  refreshInventory() {
    const wrap = document.getElementById("inv-list");
    if (!wrap) return;
    const goldEl  = document.getElementById("inv-gold");
    const countEl = document.getElementById("inv-count");

    const rows = listInventory();
    const totalCount = rows.reduce((s, r) => s + (r.qty | 0), 0);

    if (goldEl)  goldEl.textContent  = String(State.gold || 0);
    if (countEl) countEl.textContent = String(totalCount);

    wrap.innerHTML = "";
    if (rows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "tag";
      empty.textContent = "Your pack is empty.";
      wrap.appendChild(empty);
      return;
    }

    rows.forEach(({ id, qty, data }) => {
      const name = data?.name || id;
      const icon = data?.icon || "🎒";
      const canUse = (data?.type === "consumable");

      const row = document.createElement("div");
      row.className = "stat";
      row.innerHTML = `
        <b>${icon} ${name}</b>
        <div class="row" style="gap:6px">
          <span class="pill">x${qty}</span>
          ${canUse ? `<button class="btn small" data-action="use">Use</button>` : ""}
          <button class="btn small" data-action="drop">Drop</button>
        </div>
      `;

      // Use (choose target for consumables)
      if (canUse) {
        row.querySelector('[data-action="use"]').onclick = () => {
          let chooser = row.querySelector(".chooser");
          if (!chooser) {
            chooser = document.createElement("div");
            chooser.className = "row chooser";
            chooser.style.marginTop = "6px";
            chooser.style.flexWrap = "wrap";
            chooser.innerHTML = `<span class="tag">Use on:</span>`;
            (State.party || []).forEach((p, idx) => {
              const b = document.createElement("button");
              b.className = "btn small";
              b.textContent = p.name;
              b.disabled = (p.hp >= p.maxHP);
              b.title = b.disabled ? "Already at full HP" : "";
              b.onclick = () => {
                const res = useItem(id, idx);
                if (res?.ok) {
                  UI.toast(`${p.name} uses ${name}.`);
                  UI.refreshSheet();
                  UI.refreshInventory();
                } else {
                  UI.toast("Cannot use that now.");
                }
              };
              chooser.appendChild(b);
            });
            const cancel = document.createElement("button");
            cancel.className = "btn small";
            cancel.textContent = "Cancel";
            cancel.onclick = () => chooser.remove();
            chooser.appendChild(cancel);
            row.appendChild(chooser);
          }
        };
      }

      // Drop (1)
      row.querySelector('[data-action="drop"]').onclick = () => {
        const res = removeItem(id, 1);
        if (res?.ok) {
          UI.toast(`Dropped 1 × ${name}.`);
          UI.refreshInventory();
          UI.refreshSheet();
        } else {
          UI.toast("Nothing to drop.");
        }
      };

      wrap.appendChild(row);
    });
  },

  // ===== Quest tracker chip =====
  refreshQuestChip() {
    const chip = document.getElementById("quest-chip");
    if (!chip) return;
    const active = Object.values(State.quests || {}).find(q => q.status === "active");
    if (!active) {
      chip.textContent = "No active quest";
      chip.title = "No active quest";
      return;
    }
    const stage = typeof active.stage === "number" ? ` (Stage ${active.stage})` : "";
    chip.textContent = `📜 ${active.name}${stage}`;
    chip.title = "Click to go to Town";
  },
};

// helper to check active screen id
function isActive(id) {
  const el = document.getElementById(`screen-${id}`) || document.getElementById(id);
  return !!(el && el.classList.contains("active"));
}

export const SettingsUI = {
  init() {
    const btnSave  = document.getElementById("set-save");
    const btnReset = document.getElementById("set-reset");
    btnSave  && (btnSave.onclick  = () => { this.readForm(); Settings.save(); });
    btnReset && (btnReset.onclick = () => { Settings.reset(); this.syncForm(); });

    const btnOnline = document.getElementById("set-online"); // "Online Connect"
    const btnLoad   = document.getElementById("set-load");   // "Load"
    const btnQuit   = document.getElementById("set-quit");   // "Quit to Start"

    btnOnline && (btnOnline.onclick = () => UI.toast("Online Connect (coming soon)"));
    btnLoad   && (btnLoad.onclick   = () => UI.toast("Load (coming soon)"));
    btnQuit   && (btnQuit.onclick   = () => UI.toast("Quit to Start (coming soon)"));
  },

  syncForm() {
    document.getElementById("set-textsize").value = String(Settings.data.textSize || 16);
    document.getElementById("set-reduced").checked = !!Settings.data.reduced;
    document.getElementById("set-theme").value = Settings.data.theme || "dark";
  },

  readForm() {
    Settings.data.textSize = parseInt(document.getElementById("set-textsize").value, 10);
    Settings.data.reduced  = !!document.getElementById("set-reduced").checked;
    Settings.data.theme    = document.getElementById("set-theme").value;
    Settings.apply();
  }
};

// Quick pre-battle preview painter (optional)
export function showEncounterPreview(rows) {
  const box = document.getElementById("pb-enemies");
  if (!box) return;
  box.innerHTML = rows
    .map(r => `${r.emoji ?? ""} <b>${r.key}</b> ×${r.count} <span class="tag">Lv ${r.level}</span>`)
    .join("<br>");
}

export default UI;
