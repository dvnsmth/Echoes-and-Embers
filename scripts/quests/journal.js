// quests/journal.js — Quest Journal UI (creates its own screen on first open)
import { State, Notifier } from '../state.js';
import { listActive, getQuest, completeQuest } from './core.js';
import QUESTS, { Hollowroot } from './quest.js';

function ensureScreen(){
  let sc = document.getElementById('screen-journal');
  if (sc) return sc;
  const wrap = document.getElementById('screen-container');
  sc = document.createElement('section');
  sc.id = 'screen-journal';
  sc.className = 'screen panel section';
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
  sc.querySelector('#qj-close').onclick = ()=> Notifier.goto('town');
  return sc;
}

function nextActionFor(questId){
  // Minimal routing: expand per-quest as you add more
  const q = getQuest(questId);
  if (!q) {
    if (questId === Hollowroot.id) return ()=>Hollowroot.offer();
    return null;
  }
  if (questId === Hollowroot.id) {
    if (q.stage <= 0) return ()=>Hollowroot.offer();
    if (q.stage === 1) return ()=>Hollowroot.caveEntrance();
    if (q.stage >= 2 && q.status !== 'done') return ()=>Hollowroot.parley();
    return null;
  }
  // Fallback: open town or do nothing
  return null;
}

function renderList(list, into){
  into.innerHTML = '';
  list.forEach(q=>{
    const row = document.createElement('div');
    row.className = 'panel';
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
    const go = row.querySelector('.qj-continue');
    const fn = nextActionFor(q.id);
    if (fn) go.onclick = fn; else { go.disabled = true; go.textContent = '—'; }
    into.appendChild(row);
  });
}

function listCompleted(){
  const qs = Object.values(State.quests || {});
  return qs.filter(q => q.status === 'done').sort((a,b)=>a.name.localeCompare(b.name));
}

function listActives(){
  return (listActive() || []).sort((a,b)=>a.name.localeCompare(b.name));
}

export function renderJournal(){
  const sc = ensureScreen();
  renderList(listActives(), sc.querySelector('#qj-active'));
  renderList(listCompleted(), sc.querySelector('#qj-done'));
}

export function openJournal(){
  ensureScreen();
  renderJournal();
  Notifier.goto('journal');
}

// Optional global for console/testing
Object.assign(window, { openJournal });
export default { openJournal, renderJournal };
