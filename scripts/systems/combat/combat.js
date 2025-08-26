// combat.js — ATB + AP hybrid loop
import { State, Notifier } from '../state.js';
import { Utils } from '../utils.js';
import { grantXP } from '../character.js';
import { addGold } from '../party.js';
import { Storage } from '../storage.js';
import { AudioManager } from '../audio.js';



// NEW: ATB + damage helpers
import {
  derivedFrom,
  physicalDamage,
  magicalDamage,
  BASE_AP_PER_TURN,
  AP_CARRY_CAP_DEFAULT,
} from '../../data/stats.js';
import { ATBController } from './atb.js';

// ---------- small UI helpers ----------
function actionBtn(label, on) {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = label;
  b.onclick = () => { try { AudioManager.play('select'); } catch {} on(); };
  return b;
}
function hpbar(current, max) {
  const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  return `<div class="hpbar"><div style="width:${pct}%"></div></div>`;
}
function nameOf(x) { return x.name; }

// ---------- lightweight enemy wrapper for derived math ----------
function makeEnemyFromDB(def) {
  // Existing enemy DB uses hp/atk/def, etc. Map that into derivedFrom gear fields.
  const base = DB.enemies[def.type];
  const id = Utils.uid();

  const enemy = {
    id,
    name: def.type,
    emoji: base.emoji || '👾',

    // Minimal stat bag (10–60 scale baseline 12’s so math is sane)
    stats: { STR: 12, DEX: 12, CON: 12, INT: 12, WIS: 12, LCK: 12 },

    // Gear-like mapping to hit your derived formulas:
    gear: {
      baseHP: base.hp ?? 100,          // becomes HP backbone
      armor: base.def ?? 0,            // DEF contribution
      ward: base.res ?? 0,             // RES contribution (optional in your DB)
      weapon: base.atk ?? 0,           // PAtk contribution
      focus: base.matk ?? 0,           // MAtk contribution (optional)
    },

    temp: {},
    getStats() { return this.stats; },
    getDerived() {
      if (!this._derivedCache) {
        this._derivedCache = derivedFrom(this.stats, this.gear);
      }
      return this._derivedCache;
    },
    _damage(n) {
      this.hp = Math.max(0, Math.min(this.maxHP, this.hp - (n | 0)));
    },
  };

  const d = enemy.getDerived();
  enemy.maxHP = d.HP;
  enemy.hp = enemy.maxHP;

  // Simple AI tag passthrough
  enemy.ai = base.ai || 'random';

  return enemy;
}

// ---------- crit helper (uses derived critPct from attacker) ----------
function maybeCrit(attDer, baseDamage) {
  const roll = Math.random() * 100;
  const crit = (attDer.critPct || 0) > roll;
  return {
    damage: crit ? Math.floor(baseDamage * 1.5) : baseDamage,
    crit,
  };
}

// ================================================================
//                         COMBAT CONTROLLER
// ================================================================
export const Combat = {
  active: null,
  _queued: null,
  _lastRewards: null,   // {xp, gold, loot:[]}
  _stats: null,         // { [partyId]: {dealt,taken,healGiven,healReceived} }

  // ATB engine refs
  _atb: null,
  _currentEnt: null,    // entity object from ATB (ally or enemy)
  _currentChar: null,   // pointer to State.party member or enemy wrapper
  _pauseMode: true,     // freeze when someone is ready (mobile friendly)

  start(enemyDefs, opts = {}) {
    const { skipPreview = false } = opts;
    if (!skipPreview) {
      this._queued = enemyDefs;
      this.showPreview(enemyDefs);
      return;
    }
    if (State.party.length === 0) { Notifier.toast('You need at least one party member.'); return; }

    // Build enemy wrappers
    const enemies = enemyDefs.map(e => makeEnemyFromDB(e));

    // Build ATB controller
    this._atb = new ATBController({ pauseMode: this._pauseMode });

    // Register allies
    State.party.forEach(ch => {
      // Prepare runtime carry caps if you want to alter via passives later
      ch.apCarry = ch.apCarry ?? 0;
      ch.apCarryCap = ch.apCarryCap ?? AP_CARRY_CAP_DEFAULT;

      this._atb.addEntity({
        id: ch.id,
        side: 'ally',
        name: ch.name,
        getStats: () => ch.getStats(),
        onTurnStart: () => {},
        onTurnEnd:   () => {},
      });
    });

    // Register enemies
    enemies.forEach(en => {
      en.apCarry = 0;
      en.apCarryCap = AP_CARRY_CAP_DEFAULT;
      this._atb.addEntity({
        id: en.id,
        side: 'enemy',
        name: en.name,
        getStats: () => en.getStats(),
        onTurnStart: () => {},
        onTurnEnd:   () => {},
      });
    });

    // init combat state
    this.active = { enemies, turnCount: 0, round: 1 };
    // per‑party stats
    this._stats = {};
    State.party.forEach(p => { this._stats[p.id] = { dealt: 0, taken: 0, healGiven: 0, healReceived: 0 }; });

    Notifier.goto('combat');
    this.render(true);
    this.log(`Battle begins.`);
    this._bootLoop();
  },

  // ---------- PREVIEW ----------
  showPreview(enemyDefs) {
    const ov = document.getElementById('prebattle-overlay');
    const list = document.getElementById('pb-enemies');
    const g = document.getElementById('pb-gold');
    const x = document.getElementById('pb-xp');
    if (!ov || !list) return;

    list.innerHTML = '';
    enemyDefs.forEach(e => {
      const base = DB.enemies[e.type];
      const row = document.createElement('div');
      row.className = 'stat';
      row.innerHTML = `<b>${base.emoji || '👾'} ${e.type}</b><span>HP ${base.hp} • DEF ${base.def ?? 0}</span>`;
      list.appendChild(row);
    });

    if (g) g.textContent = '5–12';
    if (x) x.textContent = '30–60';

    const start = document.getElementById('pb-start');
    const cancel = document.getElementById('pb-cancel');
    start.onclick = () => {
      this.hidePreview();
      this.start(this._queued, { skipPreview: true });
      this._queued = null;
    };
    cancel.onclick = () => { this.hidePreview(); };

    ov.classList.remove('is-hidden');
    ov.setAttribute('aria-hidden', 'false');
  },
  hidePreview() {
    const ov = document.getElementById('prebattle-overlay');
    if (!ov) return;
    ov.classList.add('is-hidden');
    ov.setAttribute('aria-hidden', 'true');
  },

  // ---------- basic helpers ----------
  livingAllies() { return State.party.filter(c => c.hp > 0); },
  livingEnemies() { return (this.active?.enemies || []).filter(e => e.hp > 0); },

  // ================================================================
  //                      ATB LOOP / TURN FLOW
  // ================================================================
  _bootLoop() {
    // Simple RAF loop that ticks the ATB and pops turns in pause mode
    let last = performance.now();
    const tick = (now) => {
      if (!this.active) return;
      const dt = (now - last) / 1000;
      last = now;

      // If a turn is waiting (pause mode), do not advance time
      this._atb.tick(dt);

      if (!this._currentEnt && this._atb.hasTurnReady()) {
        // Someone is ready: freeze the world (pause mode handled in ATB)
        const ent = this._atb.popTurn();
        this._beginTurn(ent);
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  _beginTurn(ent) {
    // ent has { id, side, ap } from ATBController
    this._currentEnt = ent;

    if (ent.side === 'ally') {
      const ch = State.party.find(p => p.id === ent.id);
      this._currentChar = ch;
      ch.ap = ent.ap;              // give AP for this turn
      this.active.turnCount++;
      this.render();
      this.updateIndicators(ent);
      this.log(`Your turn: ${ch.name} (AP ${ch.ap})`);
      // Player will choose actions; endTurn when AP == 0 or player taps End Turn
    } else {
      const en = this.active.enemies.find(e => e.id === ent.id);
      this._currentChar = en;
      en.ap = ent.ap;
      this.active.turnCount++;
      this.render();
      this.updateIndicators(ent);
      setTimeout(() => this.enemyAct(en), (window.Settings?.data?.reduced) ? 0 : 260);
    }
  },

  _endTurn(carry = 0) {
    if (!this._currentEnt) return;
    // Commit carryover (capped by entity's apCarryCap, handled inside ATB)
    this._atb.endTurn(this._currentEnt, { carry });
    this._currentEnt = null;
    this._currentChar = null;

    // Check end conditions
    this.checkEnd();
    if (this.active) this.render();
  },

  // ================================================================
  //                                UI
  // ================================================================
  render() {
    const active = this.active; if (!active) return;

    // Party UI
    const pWrap = document.getElementById('combat-party'); pWrap.innerHTML = '';
    State.party.forEach(ch => {
      const row = document.createElement('div'); row.className = 'stat';
      row.dataset.id = ch.id; row.dataset.side = 'ally';
      row.innerHTML = `<div><b>${ch.name}</b>${hpbar(ch.hp, ch.maxHP)}</div><span>HP ${ch.hp}/${ch.maxHP}</span>`;
      pWrap.appendChild(row);
    });

    // Enemy UI
    const eWrap = document.getElementById('combat-enemies'); eWrap.innerHTML = '';
    active.enemies.forEach(en => {
      const row = document.createElement('div'); row.className = 'stat';
      row.dataset.id = en.id; row.dataset.side = 'enemy';
      row.innerHTML = `<div><b>${en.emoji}</b>${hpbar(en.hp, en.maxHP)}</div><span>HP ${en.hp}/${en.maxHP}</span>`;
      eWrap.appendChild(row);
    });

    this.renderActions();
  },

  updateIndicators(ent = this._currentEnt) {
    const ti = document.getElementById('turn-indicator');
    const rt = document.getElementById('round-tracker');

    // Clear highlights
    document.querySelectorAll('#combat-party .stat, #combat-enemies .stat').forEach(el => el.classList.remove('active-turn'));

    // We no longer track rounds/initiative. Show total turns elapsed.
    if (rt) rt.textContent = `Turns: ${this.active?.turnCount ?? 0}`;

    if (!ent) { if (ti) ti.textContent = '—'; return; }
    if (ent.side === 'ally') {
      const row = document.querySelector(`#combat-party .stat[data-id="${ent.id}"]`);
      row && row.classList.add('active-turn');
      const ch = State.party.find(p => p.id === ent.id);
      if (ti) ti.textContent = `🛡️ ${ch?.name || 'Ally'} turn (AP ${ch?.ap ?? 0})`;
    } else {
      const row = document.querySelector(`#combat-enemies .stat[data-id="${ent.id}"]`);
      row && row.classList.add('active-turn');
      const en = this.active.enemies.find(e => e.id === ent.id);
      if (ti) ti.textContent = `👾 ${en?.name || 'Enemy'} turn (AP ${en?.ap ?? 0})`;
    }
  },

  renderActions() {
    const wrap = document.getElementById('combat-actions'); wrap.innerHTML = '';
    if (!this._currentEnt) return; // waiting for someone to be ready

    if (this._currentEnt.side === 'enemy') {
      // Enemy will act automatically
      return;
    }

    const ch = this._currentChar;
    if (!ch || ch.hp <= 0) { this._endTurn(0); return; }

    // Show AP + actions; player can chain while AP > 0
    wrap.appendChild(actionBtn(`Attack (1 AP)`, () => this.chooseTarget(ch, 1)));
    wrap.appendChild(actionBtn(`Ability (2 AP+)`, () => this.chooseAbility(ch)));
    wrap.appendChild(actionBtn(`Item (1 AP)`, () => {
      if (State.inventory['Minor Tonic']) {
        const heal = 6;
        ch.hp = Math.min(ch.maxHP, ch.hp + heal);
        State.inventory['Minor Tonic']--;
        try { AudioManager.play('heal'); } catch {}
        this._bumpHeal(ch.id, ch.id, heal);
        this.log(`${ch.name} uses a tonic (+${heal} HP).`);
        this.render();
        ch.ap -= 1;
        if (ch.ap <= 0) this._endTurn(Math.min(2, 0)); else this.renderActions();
      } else Notifier.toast('No items.');
    }));
    wrap.appendChild(actionBtn(`End Turn`, () => {
      // carry whatever AP remains (capped)
      const carry = Math.max(0, Math.min(ch.ap, ch.apCarryCap ?? AP_CARRY_CAP_DEFAULT));
      this._endTurn(carry);
    }));
  },

  // ========= target selection =========
  chooseTarget(ch, apCost = 1) {
    const wrap = document.getElementById('combat-actions'); wrap.innerHTML = '';
    this.livingEnemies().forEach(en => {
      wrap.appendChild(actionBtn(`→ Hit ${en.name}`, () => this.doAttack(ch, en, apCost)));
    });
    wrap.appendChild(actionBtn('Back', () => this.renderActions()));
  },

  // choose ally target (heals/buffs)
  chooseAlly(ch, cb) {
    const wrap = document.getElementById('combat-actions'); wrap.innerHTML = '';
    this.livingAllies().forEach(ally => {
      wrap.appendChild(actionBtn(`→ ${ally.name}`, () => cb(ally)));
    });
    wrap.appendChild(actionBtn('Back', () => this.renderActions()));
  },

  // ========= abilities =========
  chooseAbility(ch) {
    const wrap = document.getElementById('combat-actions'); wrap.innerHTML = '';
    const abl = (DB.classes[ch.clazz]?.abilities || []).filter(a => a.lvl <= ch.level);
    abl.forEach(a => wrap.appendChild(actionBtn(a.name, () => this.useAbility(ch, a.name))));
    wrap.appendChild(actionBtn('Back', () => this.renderActions()));
  },

  // ========= tracking helpers =========
  _bumpDamage(attackerId, targetId, dmg) {
    const t = this._stats;
    if (t && attackerId && t[attackerId]) t[attackerId].dealt += dmg;
    if (t && targetId && t[targetId]) t[targetId].taken += dmg;
  },
  _bumpHeal(healerId, targetId, amt) {
    const t = this._stats;
    if (t && healerId && t[healerId]) t[healerId].healGiven += amt;
    if (t && targetId && t[targetId]) t[targetId].healReceived += amt;
  },

  // ========= new damage (derived math + crit) =========
  _doPhysical(attacker, target, skillPower = 1.0) {
    const aDer = attacker.getDerived ? attacker.getDerived() : derivedFrom(attacker.getStats(), attacker.gear);
    const tDer = target.getDerived ? target.getDerived() : derivedFrom(target.getStats(), target.gear);
    const base = physicalDamage(aDer, tDer, skillPower);
    const { damage, crit } = maybeCrit(aDer, base);
    return { damage, crit };
  },
  _doMagical(attacker, target, skillPower = 1.0) {
    const aDer = attacker.getDerived ? attacker.getDerived() : derivedFrom(attacker.getStats(), attacker.gear);
    const tDer = target.getDerived ? target.getDerived() : derivedFrom(target.getStats(), target.gear);
    const base = magicalDamage(aDer, tDer, skillPower);
    const { damage, crit } = maybeCrit(aDer, base);
    return { damage, crit };
  },

  // ========= basic attack =========
  doAttack(attacker, target, apCost = 1) {
    if (!this._currentChar || attacker.id !== this._currentChar.id) return;
    if ((attacker.ap | 0) < apCost) { Notifier.toast('Not enough AP.'); return; }

    const { damage, crit } = this._doPhysical(attacker, target, 1.0);
    target._damage(damage);
    try { AudioManager.play('hit'); } catch {}
    this._bumpDamage(attacker.id || null, target.id || null, damage);
    this.log(`${nameOf(attacker)} hits ${nameOf(target)} for ${damage}${crit ? ' (CRIT)' : ''}.`);

    attacker.ap -= apCost;
    this.render();
    if (attacker.ap <= 0) {
      this._endTurn(Math.min(attacker.apCarryCap ?? AP_CARRY_CAP_DEFAULT, 0));
    } else {
      this.renderActions();
    }
  },

  // ========= abilities (examples migrated to derived math) =========
  useAbility(ch, name) {
    const enemies = this.livingEnemies();
    switch (name) {
      case 'Power Strike': {
        const cost = 2;
        if (ch.ap < cost) { Notifier.toast('Not enough AP.'); return this.renderActions(); }
        return this._targetEnemy(ch, (en) => {
          const { damage, crit } = this._doPhysical(ch, en, 1.25); // modest skillPower
          en._damage(damage);
          try { AudioManager.play('hit'); } catch {}
          this._bumpDamage(ch.id, en.id || null, damage);
          this.log(`${ch.name} uses Power Strike for ${damage}${crit ? ' (CRIT)' : ''}.`);
          ch.ap -= cost;
          this.render();
          if (ch.ap <= 0) this._endTurn(0); else this.renderActions();
        });
      }

      case 'Twin Shot': {
        const cost = 2;
        if (ch.ap < cost) { Notifier.toast('Not enough AP.'); return this.renderActions(); }
        if (enemies.length === 0) return;
        // Hit the front enemy twice at –10% each for flavor
        const en = enemies[0];
        for (let i = 0; i < 2; i++) {
          const { damage, crit } = this._doPhysical(ch, en, 0.9);
          en._damage(damage);
          this._bumpDamage(ch.id, en.id || null, damage);
          this.log(`${ch.name} arrow ${i + 1} hits for ${damage}${crit ? ' (CRIT)' : ''}.`);
        }
        ch.ap -= cost;
        this.render();
        if (ch.ap <= 0) this._endTurn(0); else this.renderActions();
        return;
      }

      case 'Sneak Attack': {
        const cost = 2;
        if (ch.ap < cost) { Notifier.toast('Not enough AP.'); return this.renderActions(); }
        return this._targetEnemy(ch, (en) => {
          const { damage, crit } = this._doPhysical(ch, en, 1.4);
          en._damage(damage);
          this._bumpDamage(ch.id, en.id || null, damage);
          this.log(`${ch.name} Sneak Attacks for ${damage}${crit ? ' (CRIT)' : ''}.`);
          ch.ap -= cost;
          this.render();
          if (ch.ap <= 0) this._endTurn(0); else this.renderActions();
        });
      }

      case 'Firebolt': {
        const cost = 2;
        if (ch.ap < cost) { Notifier.toast('Not enough AP.'); return this.renderActions(); }
        return this._targetEnemy(ch, (en) => {
          const { damage, crit } = this._doMagical(ch, en, 1.3);
          en._damage(damage);
          this._bumpDamage(ch.id, en.id || null, damage);
          this.log(`${ch.name} hurls Firebolt for ${damage}${crit ? ' (CRIT)' : ''}.`);
          ch.ap -= cost;
          this.render();
          if (ch.ap <= 0) this._endTurn(0); else this.renderActions();
        });
      }

      case 'Heal': {
        const cost = 2;
        if (ch.ap < cost) { Notifier.toast('Not enough AP.'); return this.renderActions(); }
        return this.chooseAlly(ch, (ally) => {
          // Simple heal: WIS+INT backed — feel free to swap to your healing formula
          const aDer = ch.getDerived();
          const base = 4 + Math.floor((aDer.MAtk / 8) + (aDer.RES / 10));
          const healed = Math.max(0, Math.min(ally.maxHP - ally.hp, base));
          ally.hp = Math.min(ally.maxHP, ally.hp + base);
          if (healed > 0) this._bumpHeal(ch.id, ally.id, healed);
          this.log(`${ch.name} heals ${ally.name} for ${healed}.`);
          ch.ap -= cost;
          this.render();
          if (ch.ap <= 0) this._endTurn(0); else this.renderActions();
        });
      }

      case 'Inspire': {
        const cost = 1;
        if (ch.ap < cost) { Notifier.toast('Not enough AP.'); return this.renderActions(); }
        ch.meta._inspire = 1;
        this.log(`${ch.name} inspires the party (next ally +10% damage).`);
        ch.ap -= cost;
        this.render();
        if (ch.ap <= 0) this._endTurn(0); else this.renderActions();
        return;
      }

      default:
        Notifier.toast('Ability not implemented (yet).');
        return this.renderActions();
    }
  },

  _targetEnemy(ch, fn) {
    const wrap = document.getElementById('combat-actions'); wrap.innerHTML = '';
    this.livingEnemies().forEach(en => wrap.appendChild(actionBtn(`→ ${en.name}`, () => { fn(en); })));
    wrap.appendChild(actionBtn('Back', () => this.renderActions()));
  },

  // ========= enemy AI (simple) =========
  enemyAct(en) {
    if (!this.active) return;
    if (!this._currentEnt || this._currentEnt.id !== en.id) return;

    const targets = this.livingAllies(); if (targets.length === 0) return;
    let tgt = targets[0];
    if (en.ai === 'lowest') tgt = targets.sort((a, b) => a.hp - b.hp)[0];
    else if (en.ai === 'random') tgt = Utils.choice(targets);

    // Enemy spends AP until 0: basic attacks
    const swings = Math.max(1, Math.min(3, en.ap | 0));
    for (let i = 0; i < swings && tgt.hp > 0; i++) {
      const { damage, crit } = this._doPhysical(en, tgt, 1.0);
      // Inspire buff check (+10% to next ally damage): enemy ignores it
      tgt._damage ? tgt._damage(damage) : (tgt.hp = Math.max(0, tgt.hp - damage));
      try { AudioManager.play('hit'); } catch {}
      this._bumpDamage(null, tgt.id, damage);
      this.log(`${en.name} hits ${tgt.name} for ${damage}${crit ? ' (CRIT)' : ''}.`);
      en.ap -= 1;
      if (tgt.hp <= 0) break;
    }

    this.render();
    this._endTurn(0);
  },

  // ================================================================
  //                     END / SUMMARY / ESCAPE
  // ================================================================
  checkEnd() {
    const allies = this.livingAllies();
    const foes = this.livingEnemies();
    if (allies.length === 0) {
      this.log('Your party falls…');
      Notifier.toast('Defeat.');
      try { AudioManager.play('defeat'); } catch {}
      this.active = null;
      Storage.save();
      return;
    }
    if (foes.length === 0) {
      // Determine rewards + loot (items auto-added to inventory)
      const xp = Utils.rand(30, 60);
      const gold = Utils.rand(5, 12);
      const loot = [];
      if (Utils.rand(1, 100) <= 30) {
        State.inventory['Minor Tonic'] = (State.inventory['Minor Tonic'] || 0) + 1;
        loot.push('Minor Tonic ×1');
      }
      addGold(gold);
      grantXP(xp);
      Storage.save();

      this._lastRewards = { xp, gold, loot };

      // Show summary overlay (no auto-redirect)
      try { AudioManager.play('victory'); } catch {}
      this.showPostBattleSummary();
      return;
    }
  },

  showPostBattleSummary() {
    const ov = document.getElementById('postbattle-overlay');
    const list = document.getElementById('post-summary');
    const sumGold = document.getElementById('sum-gold');
    const sumXP = document.getElementById('sum-xp');
    const sumItems = document.getElementById('sum-items');
    const finish = document.getElementById('post-finish');
    if (!ov || !list) return;

    if (sumGold) sumGold.textContent = String(this._lastRewards?.gold ?? 0);
    if (sumXP) sumXP.textContent = String(this._lastRewards?.xp ?? 0);
    const itemsText = (this._lastRewards?.loot?.length ? this._lastRewards.loot.join(', ') : '—');
    if (sumItems) sumItems.textContent = `Items: ${itemsText}`;

    list.innerHTML = '';
    State.party.forEach(p => {
      const s = this._stats?.[p.id] || { dealt: 0, taken: 0, healGiven: 0, healReceived: 0 };
      const row = document.createElement('div');
      row.className = 'stat';
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

    finish.onclick = () => {
      const el = document.getElementById('combat-log');
      if (el) el.innerHTML = '';
      ov.classList.add('is-hidden');
      ov.setAttribute('aria-hidden', 'true');
      this.active = null;
      Notifier.goto('town');
    };

    ov.classList.remove('is-hidden');
    ov.setAttribute('aria-hidden', 'false');
  },

  tryFlee() {
    if (Utils.rand(1, 100) <= 50) {
      Notifier.toast('You flee successfully.');
      this.active = null;
      Storage.save();
      Notifier.goto('town');
    } else {
      Notifier.toast('Could not escape!');
      this.render();
    }
  },

  log(msg) {
    const el = document.getElementById('combat-log');
    const p = document.createElement('p');
    p.textContent = msg;
    el.appendChild(p);
    el.scrollTop = el.scrollHeight;
  }
};
