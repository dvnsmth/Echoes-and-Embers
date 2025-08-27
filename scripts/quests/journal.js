// quests/journal.js — Quest Journal UI (creates its own screen on first open)
import { State, Notifier } from "../systems/state.js";
import { listActive, getQuest } from "./core.js";
import { Hollowroot } from "./quests.js";
import { HOLLOWROOT_ID } from "./hollowroot.js";
import { LOST_CANYON_ID, LostCanyon } from "./lostcanyon.js";

function ensureScreen(){
  let sc = document.getElementById("screen-journal");
  if (sc) return sc;
  const wrap = document.getElementById("screen-container");
  sc = document.createElement("section");
  sc.id = "screen-journal";
  sc.className = "screen panel section";
  sc.innerHTML = `
    <h2>Quest Journal</h2>
    <div class="grid cols-2">
      <div class="col">
        <h3>Active</h3>
        <div id="qj-active" class="col"></div>
      </div>
      <div class="col">
        <h3>Completed</h3>
        <div id="qj-done" class="col"></div>
      </div>
    </div>
    <div class="row" style="margin-top:8px">
      <button class="btn" id="qj-close">⬅ Back</button>
    </div>
  `;
  wrap.appendChild(sc);
  sc.querySelector("#qj-close").onclick = ()=> Notifier.goto("town");
  return sc;
}

function nextActionFor(questId){
  const q = getQuest(questId);

  // Hollowroot routing
  if (questId === HOLLOWROOT_ID) {
    if (!q || (q.stage ?? 0) <= 0) return () => Hollowroot.offer();
    if (q.stage === 1)             return () => Hollowroot.caveEntrance();
    if (q.stage >= 2 && q.status !== "done") return () => Hollowroot.parley();
    return null;
  }

  // Lost Canyon routing
  if (questId === LOST_CANYON_ID) {
    if (!q || (q.stage ?? 0) <= 0) return () => LostCanyon.offer();
    if (q.stage === 1)             return () => LostCanyon.canyonEntrance();
    if (q.stage >= 2 && q.status !== "done") return () => LostCanyon.bossLedge();
    return null;
  }

  // Unknown quest: no continue button
  return null;
}

function renderList(list, into){
  into.innerHTML = "";
  list.forEach(q=>{
    const row = document.createElement("div");
    row.className = "panel";
    row.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:center;gap:8px">
        <div>
          <div><b>${q.name}</b></div>
          <div class="tag">Stage ${q.stage ?? 0} • ${q.status}</div>
        </div>
        <div class="row" style="gap:6px">
          <button class="btn small qj-continue">Continue</button>
        </div>
      </div>
    `;
    const go = row.querySelector(".qj-continue");
    const fn = nextActionFor(q.id);
    if (fn) go.onclick = fn; else { go.disabled = true; go.textContent = "—"; }
    into.appendChild(row);
  });
}

function listCompleted(){
  const qs = Object.values(State.quests || {});
  return qs.filter(q => q.status === "done").sort((a,b)=>a.name.localeCompare(b.name));
}

function listActives(){
  return (listActive() || []).sort((a,b)=>a.name.localeCompare(b.name));
}

export function renderJournal(){
  const sc = ensureScreen();
  renderList(listActives(), sc.querySelector("#qj-active"));
  renderList(listCompleted(), sc.querySelector("#qj-done"));
}

export function openJournal(){
  ensureScreen();
  renderJournal();
  Notifier.goto("journal");
}

// Optional global for header button / console
Object.assign(window, { openJournal });
export default { openJournal, renderJournal };
