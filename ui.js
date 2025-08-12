import { DB } from './db.js';
import { baseStats, calcMod } from './character.js';
import { Settings, State, Notifier } from './state.js';
import { Storage } from './storage.js';
import { createCharacter } from './character.js';

export const UI = {
  tabs:[
    {id:'menu', label:'🏠 Menu'},
    {id:'create', label:'🧙 Party'},
    {id:'town', label:'🏘️ Town'},
    {id:'sheet', label:'📜 Sheets'},
    {id:'inventory', label:'🎒 Inventory'},
    {id:'settings', label:'⚙️ Settings'},
  ],
  init(){
    // Bridge Notifier to concrete UI functions
    Notifier.toast = (msg)=>UI.toast(msg);
    Notifier.goto = (id)=>UI.goto(id);
    Notifier.refresh = ()=>{
      UI.refreshSheet();
      UI.refreshParty();
      UI.refreshQuestChip();
      if(isActive('inventory')) UI.refreshInventory();
    };

    // Tabs + Quest tracker chip
    const tb = document.getElementById('tabbar');
    tb.innerHTML = '';
    this.tabs.forEach(t=>{
      const b=document.createElement('button');
      b.className='btn ghost'; b.textContent=t.label; b.onclick=()=>UI.goto(t.id);
      tb.appendChild(b);
    });
    // spacer + quest chip
    const spacer = document.createElement('div'); spacer.style.flex='1';
    const chip = document.createElement('div');
    chip.className='pill';
    chip.id='quest-chip';
    chip.style.cursor='pointer';
    chip.title='Active quest';
    chip.textContent='No active quest';
    chip.onclick=()=>UI.goto('town'); // quick navigate to Town on click
    tb.appendChild(spacer);
    tb.appendChild(chip);

    // Character Creator dropdowns
    const selRace = document.getElementById('cc-race');
    const selClass = document.getElementById('cc-class');
    selRace.innerHTML = Object.keys(DB.races).map(r=>`<option>${r}</option>`).join('');
    selClass.innerHTML = Object.keys(DB.classes).map(c=>`<option>${c}</option>`).join('');

    UI.resetAllocator();
    document.getElementById('cc-add').onclick=UI.addCharacter;
    const newBtn = document.getElementById('cc-new');
    if(newBtn){ newBtn.onclick = UI.newCharacter; }

    UI.refreshParty();
    UI.refreshSheet();
    UI.refreshQuestChip();

    // Header buttons
    document.getElementById('btnSave').onclick=Storage.save;
    document.getElementById('btnLoad').onclick=Storage.load;
    document.getElementById('btnReset').onclick=()=>{ if(confirm('Reset game?')){localStorage.removeItem('hollowvale-save'); location.reload();} };
  },
  goto(id){
    // Screen routing
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const el = document.getElementById(`screen-${id}`);
    if(el){ el.classList.add('active'); }

    if(id==='town'){ window.Scenes?.townSquare?.(); }
    if(id==='sheet'){ UI.refreshSheet(); }
    if(id==='settings'){ window.SettingsUI?.syncForm?.(); }
    if(id==='inventory'){ UI.refreshInventory(); }
  },
  toast(msg){
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
    setTimeout(()=>t.remove(), (window.Settings?.data?.reduced) ? 1200 : 2200);
  },
  resetAllocator(){
    UI.alloc = { points:27, stats: baseStats() };
    const wrap = document.getElementById('cc-stats');
    wrap.innerHTML='';
    for(const k of ['STR','DEX','CON','INT','WIS','CHA']){
      const row=document.createElement('div'); row.className='stat';
      row.innerHTML=`<strong>${k}</strong><div class="row"><button class="btn small">−</button><span id="cc_${k}">${UI.alloc.stats[k]}</span><button class="btn small">＋</button></div>`;
      const [minus, , plus] = row.querySelectorAll('button,span');
      minus.onclick=()=>{ if(UI.alloc.stats[k]>8){ UI.alloc.stats[k]--; UI.alloc.points++; UI.updateAlloc(); } };
      plus.onclick=()=>{ if(UI.alloc.points>0 && UI.alloc.stats[k]<15){ UI.alloc.stats[k]++; UI.alloc.points--; UI.updateAlloc(); } };
      wrap.appendChild(row);
    }
    UI.updateAlloc();
  },
  updateAlloc(){
    for(const k of ['STR','DEX','CON','INT','WIS','CHA']) document.getElementById(`cc_${k}`).textContent=UI.alloc.stats[k];
    document.getElementById('cc-points').textContent=UI.alloc.points;
  },
  addCharacter(){
    if(State.party.length>=4) return UI.toast('Party is full.');
    const name = document.getElementById('cc-name').value.trim()||`Adventurer ${State.party.length+1}`;
    const race = document.getElementById('cc-race').value;
    const clazz = document.getElementById('cc-class').value;
    const bg = document.getElementById('cc-bg').value.trim();
    const ch = createCharacter({name,race,clazz,bg,stats:structuredClone(UI.alloc.stats)});
    State.party.push(ch);
    UI.refreshParty(); UI.refreshSheet(); UI.toast(`${ch.name} joined the party.`);
  },
  newCharacter(){
    UI.resetAllocator();
    const nameEl = document.getElementById('cc-name');
    const bgEl = document.getElementById('cc-bg');
    const raceEl = document.getElementById('cc-race');
    const classEl = document.getElementById('cc-class');
    if(nameEl) nameEl.value = '';
    if(bgEl) bgEl.value = '';
    if(raceEl) raceEl.selectedIndex = 0;
    if(classEl) classEl.selectedIndex = 0;
    UI.toast('Character form reset.');
  },
  refreshParty(){
    const list = document.getElementById('party-list');
    list.innerHTML='';
    State.party.forEach(ch=>{
      const card=document.createElement('div'); card.className='panel section';
      card.innerHTML=`
        <div class="row" style="gap:8px;align-items:center">
          <div class="avatar">${UI.classEmoji(ch.clazz)}</div>
          <div class="col" style="gap:2px">
            <strong>${ch.name}</strong>
            <span class="tag">${ch.race} ${ch.clazz} • Lv ${ch.level} • HP ${ch.hp}/${ch.maxHP}</span>
            <div class="xp-bar"><div style="width:${UI.xpPct(ch)}%"></div></div>
          </div>
          <div class="spacer"></div>
          <button class="btn small" onclick="UI.removeChar('${ch.id}')">Remove</button>
        </div>
      `;
      list.appendChild(card);
    });
    document.getElementById('party-count').textContent=`${State.party.length} / 4`;
  },
  xpPct(ch){
    const cur=ch.xp, L=ch.level, a=DB.xpCurve[L], b=DB.xpCurve[L+1]||a+1; return Math.floor(((cur-a)/(b-a))*100);
  },
  removeChar(id){ State.party = State.party.filter(c=>c.id!==id); UI.refreshParty(); UI.refreshSheet(); },
  backFromDialogue(){
    const back = UI._dlgBack || 'town';
    UI.goto(back);
  },
  classEmoji(cls){
    return {Warrior:'🛡️', Ranger:'🏹', Rogue:'🗡️', Wizard:'🪄', Cleric:'⛨', Bard:'🎻'}[cls]||'🧭';
  },
  refreshSheet(){
    const wrap = document.getElementById('sheet-list');
    wrap.innerHTML = `
      <div class="row">
        <div class="pill">💰 <b>${State.gold}</b> gold</div>
        <div class="pill">🎒 Items: ${Object.entries(State.inventory).map(([k,v])=>`${k}×${v}`).join(', ')||'—'}</div>
      </div>`;
    State.party.forEach(ch=>{
      const c=document.createElement('div'); c.className='panel section';
      const abl = (DB.classes[ch.clazz].abilities||[]).filter(a=>a.lvl<=ch.level).map(a=>a.name).join(', ');
      c.innerHTML=`
        <div class="row" style="gap:8px">
          <div class="avatar">${UI.classEmoji(ch.clazz)}</div>
          <div class="col" style="gap:2px">
            <strong>${ch.name}</strong>
            <span class="tag">${ch.race} ${ch.clazz} • Lv ${ch.level} • XP ${ch.xp}</span>
          </div>
          <div class="spacer"></div>
          <div class="pill">HP ${ch.hp}/${ch.maxHP}</div>
        </div>
        <div class="grid cols-3" style="margin-top:6px">
          ${['STR','DEX','CON','INT','WIS','CHA'].map(k=>`<div class="stat"><b>${k}</b><span>${ch.stats[k]} (mod ${calcMod(ch.stats[k])})</span></div>`).join('')}
        </div>
        <div class="row" style="margin-top:6px;gap:8px;flex-wrap:wrap">
          <div class="pill">Armor ${ch.meta.armor}</div>
          <div class="pill">Init ${ch.meta.init>=0?'+':''}${ch.meta.init}</div>
          <div class="pill">Weapon: ${ch.equips.weapon.name} ${ch.equips.weapon.dmg[0]}d${ch.equips.weapon.dmg[1]}</div>
          <div class="pill">Armor Gear: ${ch.equips.armor.name}</div>
        </div>
        <p class="tag" style="margin-top:6px">Abilities: ${abl||'—'}</p>
        <div class="row" style="margin-top:8px">
          <button class="btn small" onclick="Sheet.useTonic('${ch.id}')">Use Minor Tonic</button>
          <button class="btn small" onclick="Sheet.equip('${ch.id}')">Equip Basic Gear</button>
        </div>
      `;
      wrap.appendChild(c);
    });
  },

  // Inventory screen renderer (gold + item count + quick-use targeting)
  refreshInventory(){
    const wrap = document.getElementById('inv-list');
    if(!wrap) return;

    const goldEl = document.getElementById('inv-gold');
    const countEl = document.getElementById('inv-count');
    const entries = Object.entries(State.inventory);
    if(goldEl) goldEl.textContent = String(State.gold);
    if(countEl) countEl.textContent = String(entries.reduce((sum, [,q])=>sum+q, 0));

    wrap.innerHTML = '';

    if(entries.length === 0){
      const empty = document.createElement('p');
      empty.className = 'tag';
      empty.textContent = 'Your pack is empty.';
      wrap.appendChild(empty);
      return;
    }

    entries.forEach(([name, qty])=>{
      const row = document.createElement('div');
      row.className = 'stat';
      row.innerHTML = `
        <b>${name}</b>
        <div class="row" style="gap:6px">
          <span class="pill">x${qty}</span>
          <button class="btn small" data-action="use">Use</button>
          <button class="btn small" data-action="drop">Drop</button>
        </div>
      `;

      // Use with quick target selection (Minor Tonic supported)
      row.querySelector('[data-action="use"]').onclick = ()=>{
        if(name === 'Minor Tonic'){
          // Render a quick in-row target chooser
          let chooser = row.querySelector('.chooser');
          if(!chooser){
            chooser = document.createElement('div');
            chooser.className = 'row chooser';
            chooser.style.marginTop = '6px';
            chooser.style.flexWrap = 'wrap';
            chooser.innerHTML = `<span class="tag">Use on:</span>`;
            State.party.forEach(p=>{
              const b = document.createElement('button');
              b.className='btn small';
              b.textContent=p.name;
              b.disabled = (p.hp>=p.maxHP);
              b.title = b.disabled ? 'Already at full HP' : '';
              b.onclick = ()=>{
                // apply heal
                p.hp = Math.min(p.maxHP, p.hp + 6);
                State.inventory[name] = Math.max(0, (State.inventory[name]||0) - 1);
                if(State.inventory[name] === 0) delete State.inventory[name];
                UI.toast(`${p.name} drinks a tonic (+6 HP).`);
                UI.refreshSheet();
                UI.refreshInventory();
              };
              chooser.appendChild(b);
            });
            // cancel button
            const cancel = document.createElement('button');
            cancel.className='btn small';
            cancel.textContent='Cancel';
            cancel.onclick=()=> chooser.remove();
            chooser.appendChild(cancel);

            row.appendChild(chooser);
          }
          return;
        }
        UI.toast('This item cannot be used here.');
      };

      // Drop action (1 at a time)
      row.querySelector('[data-action="drop"]').onclick = ()=>{
        State.inventory[name] = Math.max(0, (State.inventory[name]||0) - 1);
        if(State.inventory[name] === 0) delete State.inventory[name];
        UI.toast(`Dropped 1 × ${name}.`);
        UI.refreshInventory();
        UI.refreshSheet();
      };

      wrap.appendChild(row);
    });
  },

  // Quest tracker chip text
  refreshQuestChip(){
    const chip = document.getElementById('quest-chip');
    if(!chip) return;
    const active = Object.values(State.quests||{}).find(q=>q.status==='active');
    if(!active){
      chip.textContent = 'No active quest';
      chip.title = 'No active quest';
      return;
    }
    const stage = typeof active.stage==='number'? ` (Stage ${active.stage})` : '';
    chip.textContent = `📜 ${active.name}${stage}`;
    chip.title = 'Click to go to Town';
  },
};

// helper to check active screen id
function isActive(id){
  const el = document.getElementById(`screen-${id}`);
  return !!(el && el.classList.contains('active'));
}

export const SettingsUI = {
  init(){
    document.getElementById('set-save').onclick = ()=>{ this.readForm(); Settings.save(); };
    document.getElementById('set-reset').onclick = ()=>{ Settings.reset(); this.syncForm(); };
  },
  syncForm(){
    document.getElementById('set-textsize').value = String(Settings.data.textSize||16);
    document.getElementById('set-mute').checked = !!Settings.data.muted;
    document.getElementById('set-reduced').checked = !!Settings.data.reduced;
    document.getElementById('set-theme').value = Settings.data.theme||'dark';
  },
  readForm(){
    Settings.data.textSize = parseInt(document.getElementById('set-textsize').value,10);
    Settings.data.muted = !!document.getElementById('set-mute').checked;
    Settings.data.reduced = !!document.getElementById('set-reduced').checked;
    Settings.data.theme = document.getElementById('set-theme').value;
    Settings.apply();
  }
};
