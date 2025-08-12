import { State, Notifier } from './state.js';
import { DB } from './db.js';
import { Utils, calcMod } from './utils.js';
import { addGold, grantXP } from './character.js';
import { Storage } from './storage.js';

function actionBtn(label, on){
  const b=document.createElement('button');
  b.className='btn'; b.textContent=label; b.onclick=on;
  return b;
}
function nameOf(x){ return x.meta? x.name : x.name; }
function hpbar(current, max){
  const pct = Math.max(0, Math.min(100, Math.round((current/max)*100)));
  return `<div class="hpbar"><div style="width:${pct}%"></div></div>`;
}

export const Combat = {
  active:null,
  _queued:null,
  _lastRewards:null,   // {xp, gold, loot:[]}
  _stats:null,         // { [partyId]: {dealt,taken,healGiven,healReceived} }

  start(enemyDefs, opts={}){
    const { skipPreview=false } = opts;
    if(!skipPreview){
      this._queued = enemyDefs;
      this.showPreview(enemyDefs);
      return;
    }
    if(State.party.length===0){ Notifier.toast('You need at least one party member.'); return; }

    const enemies = enemyDefs.map(e=>{
      const base=DB.enemies[e.type];
      return {id:Utils.uid(), name:e.type, hp:base.hp, maxHP:base.hp, atk:base.atk, def:base.def, dmg:base.dmg, ai:base.ai, emoji:base.emoji};
    });

    const order = [
      ...State.party.map(p=>({type:'ally', id:p.id, init:Utils.rand(1,20)+p.meta.init})),
      ...enemies.map(en=>({type:'enemy', id:en.id, init:Utils.rand(1,20)}))
    ].sort((a,b)=>b.init-a.init);

    // init combat
    this.active = {enemies, order, turn:0, round:1};
    // per-party stats
    this._stats = {};
    State.party.forEach(p=>{ this._stats[p.id] = {dealt:0,taken:0,healGiven:0,healReceived:0}; });

    Notifier.goto('combat');
    this.render(true);
    this.log(`Round ${this.active.round} begins.`);
  },

  // ---------- PREVIEW ----------
  showPreview(enemyDefs){
    const ov = document.getElementById('prebattle-overlay');
    const list = document.getElementById('pb-enemies');
    const g = document.getElementById('pb-gold');
    const x = document.getElementById('pb-xp');
    if(!ov || !list) return;

    list.innerHTML = '';
    enemyDefs.forEach(e=>{
      const base = DB.enemies[e.type];
      const row = document.createElement('div');
      row.className='stat';
      row.innerHTML = `<b>${base.emoji || '👾'} ${e.type}</b><span>HP ${base.hp} • DEF ${base.def}</span>`;
      list.appendChild(row);
    });

    if(g) g.textContent = '5–12';
    if(x) x.textContent = '30–60';

    const start = document.getElementById('pb-start');
    const cancel = document.getElementById('pb-cancel');
    start.onclick = ()=>{
      this.hidePreview();
      this.start(this._queued, {skipPreview:true});
      this._queued = null;
    };
    cancel.onclick = ()=>{ this.hidePreview(); };

    ov.classList.remove('is-hidden');
    ov.setAttribute('aria-hidden','false');
  },
  hidePreview(){
    const ov = document.getElementById('prebattle-overlay');
    if(!ov) return;
    ov.classList.add('is-hidden');
    ov.setAttribute('aria-hidden','true');
  },

  // ---------- LIFECYCLE ----------
  livingAllies(){ return State.party.filter(c=>c.hp>0); },
  livingEnemies(){ return (this.active?.enemies||[]).filter(e=>e.hp>0); },

  currentActor(){
    const c=this.active; if(!c) return null;
    for(let i=c.turn; i<c.order.length; i++){
      const act=c.order[i];
      if(act.type==='ally'){
        const ch=State.party.find(p=>p.id===act.id); if(ch && ch.hp>0) return act;
      } else {
        const en=c.enemies.find(e=>e.id===act.id); if(en && en.hp>0) return act;
      }
    }
    return null;
  },

  render(){
    const c=this.active; if(!c) return;

    // Party UI
    const pWrap=document.getElementById('combat-party'); pWrap.innerHTML='';
    State.party.forEach(ch=>{
      const row=document.createElement('div'); row.className='stat';
      row.dataset.id = ch.id; row.dataset.side='ally';
      row.innerHTML=`<div><b>${ch.name}</b>${hpbar(ch.hp, ch.maxHP)}</div><span>HP ${ch.hp}/${ch.maxHP}</span>`;
      pWrap.appendChild(row);
    });

    // Enemy UI
    const eWrap=document.getElementById('combat-enemies'); eWrap.innerHTML='';
    c.enemies.forEach(en=>{
      const row=document.createElement('div'); row.className='stat';
      row.dataset.id = en.id; row.dataset.side='enemy';
      row.innerHTML=`<div><b>${en.emoji}</b>${hpbar(en.hp, en.maxHP)}</div><span>HP ${en.hp}/${en.maxHP}</span>`;
      eWrap.appendChild(row);
    });

    this.updateIndicators();
    this.renderActions();
  },

  updateIndicators(){
    const c=this.active; if(!c) return;
    const ti = document.getElementById('turn-indicator');
    const rt = document.getElementById('round-tracker');

    // Clear highlights
    document.querySelectorAll('#combat-party .stat, #combat-enemies .stat').forEach(el=>el.classList.remove('active-turn'));

    const me = this.nextActorPeek();
    const totalAlive = this.livingAllies().length + this.livingEnemies().length;
    const turnNum = Math.min(c.turn+1, totalAlive) || 1;
    if(rt) rt.textContent = `Round ${c.round} — Turn ${turnNum}/${totalAlive}`;

    if(!me){ if(ti) ti.textContent='—'; return; }
    if(me.type==='ally'){
      const ch=State.party.find(p=>p.id===me.id);
      if(ti) ti.textContent = `🛡️ ${ch?.name || 'Ally'} turn`;
      const row = document.querySelector(`#combat-party .stat[data-id="${me.id}"]`);
      row && row.classList.add('active-turn');
    } else {
      const en=c.enemies.find(e=>e.id===me.id);
      if(ti) ti.textContent = `👾 ${en?.name || 'Enemy'} turn`;
      const row = document.querySelector(`#combat-enemies .stat[data-id="${me.id}"]`);
      row && row.classList.add('active-turn');
    }
  },

  renderActions(){
    const wrap=document.getElementById('combat-actions'); wrap.innerHTML='';
    const me = this.nextActor(); // lock to current live actor
    if(!me){ this.checkEnd(); return; }

    this.updateIndicators();

    if(me.type==='enemy'){
      setTimeout(()=>this.enemyAct(me), (window.Settings?.data?.reduced) ? 0 : 360);
      return;
    }

    const ch = State.party.find(p=>p.id===me.id);
    wrap.appendChild(actionBtn(`Attack`, ()=>this.chooseTarget(ch)));
    wrap.appendChild(actionBtn(`Ability`, ()=>this.chooseAbility(ch)));
    wrap.appendChild(actionBtn(`Item`, ()=>{
      if(State.inventory['Minor Tonic']){
        const heal=6;
        ch.hp=Math.min(ch.maxHP,ch.hp+heal);
        State.inventory['Minor Tonic']--;
        this._bumpHeal(ch.id, ch.id, heal); // self heal tracked as given+received
        this.log(`${ch.name} uses a tonic (+${heal} HP).`);
        this.render();
        this.endTurn();
      } else Notifier.toast('No items.');
    }));
  },

  nextActorPeek(){
    const c=this.active; if(!c) return null;
    let t=c.turn;
    while(t < c.order.length){
      const act=c.order[t];
      if(act.type==='ally'){
        const ch=State.party.find(p=>p.id===act.id); if(ch && ch.hp>0) return act; else t++;
      } else {
        const en=c.enemies.find(e=>e.id===act.id); if(en && en.hp>0) return act; else t++;
      }
    }
    return null;
  },

  nextActor(){
    const c=this.active; if(!c) return null;
    while(c.turn < c.order.length){
      const act=c.order[c.turn];
      if(act.type==='ally'){
        const ch=State.party.find(p=>p.id===act.id); if(ch && ch.hp>0) return act; else c.turn++;
      } else {
        const en=c.enemies.find(e=>e.id===act.id); if(en && en.hp>0) return act; else c.turn++;
      }
    }
    c.turn=0; c.round++;
    this.log(`Round ${c.round} begins.`);
    return this.nextActor();
  },

  chooseTarget(ch){
    const wrap=document.getElementById('combat-actions'); wrap.innerHTML='';
    this.livingEnemies().forEach(en=>{
      wrap.appendChild(actionBtn(`Hit ${en.name}`, ()=>this.doAttack(ch,en)));
    });
    wrap.appendChild(actionBtn('Back', ()=>this.renderActions()));
  },

  // NEW: choose ally target (for heals/buffs)
  chooseAlly(ch, cb){
    const wrap=document.getElementById('combat-actions'); wrap.innerHTML='';
    this.livingAllies().forEach(ally=>{
      wrap.appendChild(actionBtn(`→ ${ally.name}`, ()=>cb(ally)));
    });
    wrap.appendChild(actionBtn('Back', ()=>this.renderActions()));
  },

  chooseAbility(ch){
    const wrap=document.getElementById('combat-actions'); wrap.innerHTML='';
    const abl = (DB.classes[ch.clazz].abilities||[]).filter(a=>a.lvl<=ch.level);
    abl.forEach(a=>wrap.appendChild(actionBtn(a.name,()=>this.useAbility(ch,a.name))));
    wrap.appendChild(actionBtn('Back', ()=>this.renderActions()));
  },

  // tracking helpers
  _bumpDamage(attackerId, targetId, dmg){
    const t = this._stats;
    if(t && attackerId && t[attackerId]) t[attackerId].dealt += dmg;
    if(t && targetId && t[targetId]) t[targetId].taken += dmg;
  },
  _bumpHeal(healerId, targetId, amt){
    const t = this._stats;
    if(t && healerId && t[healerId]) t[healerId].healGiven += amt;
    if(t && targetId && t[targetId]) t[targetId].healReceived += amt;
  },

  // Rolls & damage
  hitRoll(attacker, defender){
    const atk = attacker.meta? (10 + calcMod(attacker.stats[ DB.classes[attacker.clazz].primary ]) ) : attacker.atk;
    const def = defender.meta? defender.meta.armor : defender.def;
    const roll = Utils.roll(20) + atk;
    return {roll, def};
  },
  damage(attacker, base){
    if(attacker.meta){
      const w=attacker.equips.weapon; const die = w.dmg[1]; const dice=w.dmg[0];
      let dmg=0; for(let i=0;i<dice;i++) dmg+=Utils.roll(die);
      dmg += calcMod(attacker.stats.STR);
      if(attacker.clazz==='Rogue') dmg += 1;
      return Math.max(1,dmg + (base||0));
    } else {
      const [cnt,die] = [1, attacker.dmg[1]];
      let d=0; for(let i=0;i<cnt;i++) d+=Utils.roll(die);
      return Math.max(1, d);
    }
  },

  doAttack(attacker, target){
    const {roll,def} = this.hitRoll(attacker,target);
    if(roll>=def){
      let extra=0; if(attacker.meta && attacker.meta.openingStrike){ extra+=1; attacker.meta.openingStrike=0; }
      const dmg = this.damage(attacker, extra);
      target.hp = Math.max(0, target.hp - dmg);
      // track if ally involved
      const atkId = attacker.meta ? attacker.id : null;
      const tgtId = target.meta ? target.id : null;
      this._bumpDamage(atkId, tgtId, dmg);

      this.log(`${nameOf(attacker)} hits ${nameOf(target)} for ${dmg}.`);
    } else {
      this.log(`${nameOf(attacker)} misses ${nameOf(target)}.`);
    }
    this.render();
    this.endTurn();
  },

  useAbility(ch, name){
    const enemies = this.livingEnemies();
    switch(name){
      case 'Power Strike': return this._targeted(ch, en=>{
        const {roll,def}=this.hitRoll(ch,en);
        if(roll>=def){
          const dmg=this.damage(ch,2);
          en.hp=Math.max(0,en.hp-dmg);
          this._bumpDamage(ch.id, null, 0); // keep structure (optional)
          this._bumpDamage(ch.id, null, 0);
          this._bumpDamage(ch.id, undefined, 0);
          this._bumpDamage(ch.id, (en.meta?en.id:null), dmg); // enemy wont be counted; safe
          this.log(`${ch.name} uses Power Strike for ${dmg}.`);
        } else this.log(`${ch.name}'s strike misses.`);
        this.render(); this.endTurn();
      });

      case 'Twin Shot': {
        if(enemies.length===0) return;
        const en=enemies[0];
        for(let i=0;i<2;i++){
          const {roll,def}=this.hitRoll(ch,en);
          if(roll>=def){
            const dmg=Math.max(1,this.damage(ch,-1));
            en.hp=Math.max(0,en.hp-dmg);
            this._bumpDamage(ch.id, null, 0);
            this._bumpDamage(ch.id, (en.meta?en.id:null), dmg);
            this.log(`${ch.name} arrow ${i+1} hits for ${dmg}.`);
          } else this.log('Arrow misses.');
        }
        this.render(); return this.endTurn();
      }

      case 'Sneak Attack': return this._targeted(ch, en=>{
        const {roll,def}=this.hitRoll(ch,en);
        if(roll>=def){
          const dmg=this.damage(ch,Utils.roll(4));
          en.hp=Math.max(0,en.hp-dmg);
          this._bumpDamage(ch.id, (en.meta?en.id:null), dmg);
          this.log(`${ch.name} Sneak Attacks for ${dmg}.`);
        } else this.log('The stab fails.');
        this.render(); this.endTurn();
      });

      case 'Firebolt': return this._targeted(ch, en=>{
        const atk = 10+calcMod(ch.stats.INT);
        const roll=Utils.roll(20)+atk;
        if(roll>=en.def){
          const dmg=2+Utils.roll(6);
          en.hp=Math.max(0,en.hp-dmg);
          this._bumpDamage(ch.id, (en.meta?en.id:null), dmg);
          this.log(`${ch.name} hurls Firebolt for ${dmg}.`);
        } else this.log('The bolt fizzles.');
        this.render(); this.endTurn();
      });

      // UPDATED: Heal can choose any ally
      case 'Heal': {
        return this.chooseAlly(ch, (ally)=>{
          const amt = 4+calcMod(ch.stats.WIS);
          const healed = Math.max(0, Math.min(ally.maxHP - ally.hp, amt));
          ally.hp = Math.min(ally.maxHP, ally.hp + amt);
          if(healed>0) this._bumpHeal(ch.id, ally.id, healed);
          this.log(`${ch.name} heals ${ally.name} for ${healed}.`);
          this.render(); this.endTurn();
        });
      }

      case 'Inspire': {
        ch.meta._inspire = 1;
        this.log(`${ch.name} inspires the party (next ally +1 attack).`);
        this.render(); return this.endTurn();
      }

      default: Notifier.toast('Ability not implemented (yet).');
    }
  },

  _targeted(ch, fn){
    const wrap=document.getElementById('combat-actions'); wrap.innerHTML='';
    this.livingEnemies().forEach(en=>wrap.appendChild(actionBtn(`→ ${en.name}`,()=>{ fn(en); })));
    wrap.appendChild(actionBtn('Back', ()=>this.renderActions()));
  },

  enemyAct(me){
    const c=this.active; if(!c) return;
    const en = c.enemies.find(e=>e.id===me.id);
    const targets = this.livingAllies(); if(targets.length===0) return;
    let tgt=targets[0];
    if(en.ai==='lowest'){ tgt = targets.sort((a,b)=>a.hp-b.hp)[0]; }
    else if(en.ai==='random'){ tgt = Utils.choice(targets); }

    const {roll,def}=this.hitRoll(en,tgt);
    let atkBonus=0; if(State.party.some(p=>p.meta && p.meta._inspire)){ atkBonus=1; State.party.forEach(p=>p.meta._inspire=0); }
    if(roll+atkBonus>=def){
      const dmg=this.damage(en);
      tgt.hp=Math.max(0,tgt.hp-dmg);
      this._bumpDamage(null, tgt.id, dmg); // enemy dealt to ally
      this.log(`${en.name} hits ${tgt.name} for ${dmg}.`);
    } else {
      this.log(`${en.name} misses ${tgt.name}.`);
    }
    this.render();
    this.endTurn();
  },

  endTurn(){
    const c=this.active; if(!c) return;
    c.turn++;
    this.checkEnd();
    if(this.active) this.render();
  },

  checkEnd(){
    const allies = this.livingAllies();
    const foes = this.livingEnemies();
    if(allies.length===0){
      this.log('Your party falls…');
      Notifier.toast('Defeat.');
      this.active=null;
      Storage.save();
      return;
    }
    if(foes.length===0){
      // Determine rewards + loot (items auto-added to inventory)
      const xp=Utils.rand(30,60);
      const gold=Utils.rand(5,12);
      const loot = [];
      if(Utils.rand(1,100)<=30){
        State.inventory['Minor Tonic'] = (State.inventory['Minor Tonic']||0)+1;
        loot.push('Minor Tonic ×1');
      }
      addGold(gold);
      grantXP(xp);
      Storage.save();

      this._lastRewards = {xp, gold, loot};

      // Show summary overlay (no auto-redirect)
      this.showPostBattleSummary();

      return;
    }
  },

  showPostBattleSummary(){
    const ov = document.getElementById('postbattle-overlay');
    const list = document.getElementById('post-summary');
    const sumGold = document.getElementById('sum-gold');
    const sumXP = document.getElementById('sum-xp');
    const sumItems = document.getElementById('sum-items');
    const finish = document.getElementById('post-finish');
    if(!ov || !list) return;

    // Fill totals
    if(sumGold) sumGold.textContent = String(this._lastRewards?.gold ?? 0);
    if(sumXP) sumXP.textContent = String(this._lastRewards?.xp ?? 0);
    const itemsText = (this._lastRewards?.loot?.length ? this._lastRewards.loot.join(', ') : '—');
    if(sumItems) sumItems.textContent = `Items: ${itemsText}`;

    // Per‑member stats
    list.innerHTML = '';
    State.party.forEach(p=>{
      const s = this._stats?.[p.id] || {dealt:0,taken:0,healGiven:0,healReceived:0};
      const row = document.createElement('div');
      row.className='stat';
      row.innerHTML = `
        <b>${p.name}</b>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <span class="pill">Dealt: <b>${s.dealt}</b></span>
          <span class="pill">Taken: <b>${s.taken}</b></span>
          <span class="pill">Healed: <b>${s.healGiven}</b></span>
          <span class="pill">Recovery: <b>${s.healReceived}</b></span>
        </div>`;
      list.appendChild(row);
    });

    finish.onclick = ()=>{
      // Clear log, close, go to town
      const el=document.getElementById('combat-log');
      if(el) el.innerHTML='';
      ov.classList.add('is-hidden');
      ov.setAttribute('aria-hidden','true');
      this.active=null;
      Notifier.goto('town');
    };

    ov.classList.remove('is-hidden');
    ov.setAttribute('aria-hidden','false');
  },

  tryFlee(){
    if(Utils.rand(1,100)<=50){
      Notifier.toast('You flee successfully.');
      this.active=null;
      Storage.save();
      Notifier.goto('town');
    } else {
      Notifier.toast('Could not escape!');
      this.render();
    }
  },

  log(msg){
    const el=document.getElementById('combat-log');
    const p=document.createElement('p');
    p.textContent=msg;
    el.appendChild(p);
    el.scrollTop=el.scrollHeight;
  }
};
