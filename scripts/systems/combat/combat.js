// /scripts/systems/combat/combat.js
// ATB + simple AP loop (strict, no DB). Works with instantiateEncounter() foes.

import { State, Notifier } from "systems/state.js";
import { Utils } from "systems/utils.js";
import { grantXP } from "systems/character.js";
import { addGold } from "systems/party.js";
import { Storage } from "systems/storage.js";
import { ATBController } from "./atb.js";
import { instantiateEncounter } from "./encounters.js";
import { BASE_AP_PER_TURN, AP_CARRY_CAP_DEFAULT } from "data/stats.js";
import { classes } from "data/class.js";
import { useItem, getQty, addItem } from "systems/inventory.js";

// ---------- tiny UI helpers ----------
function actionBtn(label, on) {
  const b = document.createElement("button");
  b.className = "btn";
  b.textContent = label;
  b.onclick = () => { try { AudioManager.play?.("select"); } catch {} on(); };
  return b;
}
function hpbar(current, max) {
  const pct = Math.max(0, Math.min(100, Math.round((current / Math.max(1, max)) * 100)));
  return `<div class="hpbar"><div style="width:${pct}%"></div></div>`;
}
const nameOf = (x) => x?.name ?? "—";

// ---------- normalize foes (accept defs or instances) ----------
function normalizeFoes(maybeDefsOrFoes = []) {
  // If they already have hpCurrent, assume instances
  if (Array.isArray(maybeDefsOrFoes) && maybeDefsOrFoes[0]?.hpCurrent != null) {
    return maybeDefsOrFoes.map(f => ({ ...f, name: f.name || f.key }));
  }
  // Otherwise, instantiate from defs
  return instantiateEncounter(maybeDefsOrFoes);
}

// Basic enemy stat shim for ATB (DEX pacing). Scale with level a bit.
function foeStatsForATB(foe) {
  const lvl = Math.max(1, foe.level ?? 1);
  return { DEX: foe.stats?.DEX ?? (10 + Math.min(20, Math.round(Math.max(1, foe.level ?? 1) * 1.5))) };
}

// Physical damage (simple): random weapon die + atk - def, min 1
function physDamage(att, tgt, power = 1.0) {
  const [dMin, dMax] = Array.isArray(att.dmg) ? att.dmg : [1, 4];
  const roll = Utils.rand(dMin, dMax);
  const base = Math.floor((roll + (att.atk | 0) - (tgt.def | 0)) * power);
  const dmg = Math.max(1, base);
  // small 5% enemy crit, 10% ally crit (feel free to tune or wire to derived crit)
  const critChance = att.side === "ally" ? 10 : 5;
  const crit = Math.random() * 100 < critChance;
  return { damage: crit ? Math.floor(dmg * 1.5) : dmg, crit };
}

// ---------- main controller ----------
export const Combat = {
  _bumpDamage(attackerId, targetId, amount) {
    if (!this._stats) return;
    if (attackerId && this._stats[attackerId]) this._stats[attackerId].dealt += amount;
    if (targetId && this._stats[targetId]) this._stats[targetId].taken += amount;
  },
  active: null,
  _atb: null,
  _currentEnt: null,
  _currentChar: null,
  _stats: null,         // { [partyId]: { dealt,taken,healGiven,healReceived } }
  _queued: null,
  _lastRewards: null,

  /**
   * Start combat.
   * Accepts:
   *   - Combat.start({ foes, skipPreview })
   *   - Combat.start(foeDefsArray, { skipPreview })
   */
  start(arg, opts = {}) {
    // Support old call: start(defs, {skipPreview})
    if (Array.isArray(arg)) {
      this._queued = normalizeFoes(arg);
      return (opts.skipPreview ? this._begin() : this.showPreview(this._queued));
    }
    // New call: start({ foes, skipPreview })
    const foes = normalizeFoes(arg?.foes || []);
    this._queued = foes;
    return (arg?.skipPreview ? this._begin() : this.showPreview(foes));
  },

  _begin() {
    if (!State.party?.length) { Notifier.toast("You need at least one party member."); return; }
    const enemies = this._queued || [];
    this._queued = null;

    // Build ATB controller
    this._atb = new ATBController({ pauseMode: true });

    // Register allies
    State.party.forEach(ch => {
      ch.apCarry = ch.apCarry ?? 0;
      ch.apCarryCap = ch.apCarryCap ?? AP_CARRY_CAP_DEFAULT;
      this._atb.addEntity({
        id: ch.id,
        side: "ally",
        name: ch.name,
        getStats: () => ch.stats, // DEX is used by ATB
        onTurnStart: () => {},
        onTurnEnd: () => {},
      });
    });

    // Register enemies
    enemies.forEach(en => {
      en.side = "enemy"; // mark side for crit bias, etc.
      en.apCarry = 0;
      en.apCarryCap = AP_CARRY_CAP_DEFAULT;
      this._atb.addEntity({
        id: en.id,
        side: "enemy",
        name: en.name || en.key,
        getStats: () => foeStatsForATB(en),
        onTurnStart: () => {},
        onTurnEnd: () => {},
      });
    });

    this.active = { enemies, turnCount: 0 };
    this._stats = {};
    State.party.forEach(p => { this._stats[p.id] = { dealt: 0, taken: 0, healGiven: 0, healReceived: 0 }; });

    Notifier.goto("combat");
    this.render(true);
    this.log("Battle begins.");
    this._bootLoop();
  },

  // ---------- preview ----------
  showPreview(foes) {
    const ov = document.getElementById("prebattle-overlay");
    const list = document.getElementById("pb-enemies");
    const g = document.getElementById("pb-gold");
    const x = document.getElementById("pb-xp");
    if (!ov || !list) return;

    list.innerHTML = "";
    foes.forEach(f => {
      const row = document.createElement("div");
      row.className = "stat";
      row.innerHTML = `<b>${f.emoji ?? "👾"} ${f.name || f.key}</b><span>HP ${f.hpMax ?? f.hp ?? "?"} • DEF ${f.def ?? 0}</span>`;
      list.appendChild(row);
    });

    if (g) g.textContent = "5–12";
    if (x) x.textContent = "30–60";

    const start = document.getElementById("pb-start");
    const cancel = document.getElementById("pb-cancel");
    start.onclick = () => { this.hidePreview(); this._begin(); };
    cancel.onclick = () => { this.hidePreview(); };

    ov.classList.remove("is-hidden");
    ov.setAttribute("aria-hidden", "false");
  },
  hidePreview() {
    const ov = document.getElementById("prebattle-overlay");
    if (!ov) return;
    ov.classList.add("is-hidden");
    ov.setAttribute("aria-hidden", "true");
  },

  // ---------- helpers ----------
  livingAllies()  { return (State.party || []).filter(c => c.hp > 0); },
  livingEnemies() { return (this.active?.enemies || []).filter(e => (e.hpCurrent ?? e.hp) > 0); },

  damageFoe(foe, n) {
    foe.hpMax = foe.hpMax ?? foe.hp ?? 1;
    foe.hpCurrent = Math.max(0, Math.min(foe.hpMax, (foe.hpCurrent ?? foe.hpMax) - (n | 0)));
  },

  // ---------- ATB loop ----------
  _bootLoop() {
    let last = performance.now();
    const tick = (now) => {
      if (!this.active) return;
      const dt = (now - last) / 1000;
      last = now;

      this._atb.tick(dt);

      if (!this._currentEnt && this._atb.hasTurnReady()) {
        const ent = this._atb.popTurn();
        this._beginTurn(ent);
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  _beginTurn(ent) {
    this._currentEnt = ent;
    this.active.turnCount++;

    if (ent.side === "ally") {
      const ch = State.party.find(p => p.id === ent.id);
      this._currentChar = ch;
      ch.ap = ent.ap;
      this.render();
      this.updateIndicators(ent);
      this.log(`Your turn: ${ch.name} (AP ${ch.ap})`);
    } else {
      const en = this.active.enemies.find(e => e.id === ent.id);
      this._currentChar = en;
      en.ap = ent.ap;
      this.render();
      this.updateIndicators(ent);
      setTimeout(() => this.enemyAct(en), (window.Settings?.data?.reduced) ? 0 : 260);
    }
  },

  _endTurn(carry = 0) {
    if (!this._currentEnt) return;
    this._atb.endTurn(this._currentEnt, { carry });
    this._currentEnt = null;
    this._currentChar = null;

    this.checkEnd();
    if (this.active) this.render();
  },

  // ---------- UI ----------
  render() {
    const active = this.active; if (!active) return;

    const pWrap = document.getElementById("combat-party");
    const eWrap = document.getElementById("combat-enemies");
    const aWrap = document.getElementById("combat-actions");
    if (pWrap) pWrap.innerHTML = "";
    if (eWrap) eWrap.innerHTML = "";
    if (aWrap) aWrap.innerHTML = "";

    // Party
    (State.party || []).forEach(ch => {
      const row = document.createElement("div");
      row.className = "stat";
      row.dataset.id = ch.id; row.dataset.side = "ally";
      row.innerHTML = `<div><b>${ch.name}</b>${hpbar(ch.hp, ch.maxHP)}</div><span>HP ${ch.hp}/${ch.maxHP}</span>`;
      pWrap?.appendChild(row);
    });

    // Enemies
    active.enemies.forEach(en => {
      const hpMax = en.hpMax ?? en.hp ?? 1;
      const hpCur = en.hpCurrent ?? en.hp ?? hpMax;
      const row = document.createElement("div");
      row.className = "stat";
      row.dataset.id = en.id; row.dataset.side = "enemy";
      row.innerHTML = `<div><b>${en.emoji ?? "👾"} ${en.name || en.key}</b>${hpbar(hpCur, hpMax)}</div><span>HP ${hpCur}/${hpMax}</span>`;
      eWrap?.appendChild(row);
    });

    this.renderActions();
  },

  updateIndicators(ent = this._currentEnt) {
    const ti = document.getElementById("turn-indicator");
    const rt = document.getElementById("round-tracker");
    document.querySelectorAll("#combat-party .stat, #combat-enemies .stat").forEach(el => el.classList.remove("active-turn"));
    if (rt) rt.textContent = `Turns: ${this.active?.turnCount ?? 0}`;

    if (!ent) { if (ti) ti.textContent = "—"; return; }
    if (ent.side === "ally") {
      const row = document.querySelector(`#combat-party .stat[data-id="${ent.id}"]`);
      row?.classList.add("active-turn");
      const ch = State.party.find(p => p.id === ent.id);
      if (ti) ti.textContent = `🛡️ ${ch?.name || "Ally"} turn (AP ${ch?.ap ?? 0})`;
    } else {
      const row = document.querySelector(`#combat-enemies .stat[data-id="${ent.id}"]`);
      row?.classList.add("active-turn");
      const en = this.active.enemies.find(e => e.id === ent.id);
      if (ti) ti.textContent = `👾 ${en?.name || "Enemy"} turn (AP ${en?.ap ?? 0})`;
    }
  },

  renderActions() {
    const wrap = document.getElementById("combat-actions");
    if (!wrap || !this._currentEnt) return;

    if (this._currentEnt.side === "enemy") return;

    const ch = this._currentChar;
    if (!ch || ch.hp <= 0) { this._endTurn(0); return; }

    // Player actions
    wrap.appendChild(actionBtn(`Attack (1 AP)`, () => this.chooseTarget(ch, 1)));
    wrap.appendChild(actionBtn(`Ability (2 AP+)`, () => this.chooseAbility(ch)));
    wrap.appendChild(actionBtn(`Item (1 AP)`, () => this.chooseItem(ch)));
    wrap.appendChild(actionBtn(`End Turn`, () => {
      const carry = Math.max(0, Math.min(ch.ap | 0, ch.apCarryCap ?? AP_CARRY_CAP_DEFAULT));
      this._endTurn(carry);
    }));
  },

  // ---------- items ----------
  chooseItem(ch) {
    const wrap = document.getElementById("combat-actions"); wrap.innerHTML = "";
    const tonicQty = getQty("minor_tonic");
    if (tonicQty <= 0) {
      wrap.appendChild(actionBtn("No usable items", () => this.renderActions()));
      wrap.appendChild(actionBtn("Back", () => this.renderActions()));
      return;
    }
    // choose party member target
    this.chooseAlly(ch, (ally) => {
      if ((ch.ap | 0) < 1) { Notifier.toast("Not enough AP."); return this.renderActions(); }
      const idx = (State.party || []).findIndex(p => p.id === ally.id);
      const res = useItem("minor_tonic", idx);
      if (res?.ok) {
        try { AudioManager.play?.("heal"); } catch {}
        this._bumpHeal(ch.id, ally.id, 6); // approximate
        this.log(`${ch.name} uses Minor Tonic on ${ally.name}.`);
        ch.ap -= 1;
        this.render();
        if (ch.ap <= 0) this._endTurn(0); else this.renderActions();
      } else {
        Notifier.toast("Cannot use that now.");
        this.renderActions();
      }
    });
  },

  // ---------- target pickers ----------
  chooseTarget(ch, apCost = 1) {
    const wrap = document.getElementById("combat-actions"); wrap.innerHTML = "";
    this.livingEnemies().forEach(en => {
      wrap.appendChild(actionBtn(`→ Hit ${en.name || en.key}`, () => this.doAttack(ch, en, apCost)));
    });
    wrap.appendChild(actionBtn("Back", () => this.renderActions()));
  },

  chooseAlly(ch, cb) {
    const wrap = document.getElementById("combat-actions"); wrap.innerHTML = "";
    this.livingAllies().forEach(ally => {
      const disabled = ally.hp >= ally.maxHP;
      const btn = actionBtn(`→ ${ally.name}${disabled ? " (full)" : ""}`, () => !disabled && cb(ally));
      btn.disabled = disabled;
      wrap.appendChild(btn);
    });
    wrap.appendChild(actionBtn("Back", () => this.renderActions()));
  },

  // ---------- abilities ----------
  chooseAbility(ch) {
    const wrap = document.getElementById("combat-actions"); wrap.innerHTML = "";
    const abl = (classes[ch.clazz]?.abilities || []).filter(a => (a.lvl ?? 1) <= ch.level);
    if (!abl.length) {
      wrap.appendChild(actionBtn("No abilities", () => this.renderActions()));
      wrap.appendChild(actionBtn("Back", () => this.renderActions()));
      return;
    }
    abl.forEach(a => wrap.appendChild(actionBtn(a.name, () => this.useAbility(ch, a.name))));
    wrap.appendChild(actionBtn("Back", () => this.renderActions()));
  },

  useAbility(ch, name) {
    switch (name) {
      case "Power Strike": {
        const cost = 2;
        if ((ch.ap | 0) < cost) { Notifier.toast("Not enough AP."); return this.renderActions(); }
        return this._targetEnemy(ch, (en) => {
          const { damage, crit } = physDamage(
            { atk: ch.getDerived().PAtk, dmg: [2, 6], side: "ally" },
            { def: en.def ?? 0, dmg: en.dmg || [1,4], side: "enemy" },
            1.25
          );
          this.damageFoe(en, damage);
          this._bumpDamage(ch.id, en.id, damage);
          try { AudioManager.play?.("hit"); } catch {}
          this.log(`${ch.name} uses Power Strike for ${damage}${crit ? " (CRIT)" : ""}.`);
          ch.ap -= cost; this.render(); (ch.ap <= 0) ? this._endTurn(0) : this.renderActions();
        });
      }

      case "Firebolt": {
        const cost = 2;
        if ((ch.ap | 0) < cost) { Notifier.toast("Not enough AP."); return this.renderActions(); }
        return this._targetEnemy(ch, (en) => {
          const { damage, crit } = physDamage( // using physDamage for now; swap when MAtk/RES pipeline is ready
            { atk: Math.floor(ch.getDerived().MAtk * 0.8), dmg: [3, 7], side: "ally" },
            { def: en.def ?? 0, dmg: en.dmg || [1,4], side: "enemy" },
            1.2
          );
          this.damageFoe(en, damage);
          this._bumpDamage(ch.id, en.id, damage);
          try { AudioManager.play?.("hit"); } catch {}
          this.log(`${ch.name} casts Firebolt for ${damage}${crit ? " (CRIT)" : ""}.`);
          ch.ap -= cost; this.render(); (ch.ap <= 0) ? this._endTurn(0) : this.renderActions();
        });
      }

      case "Heal": {
        const cost = 2;
        if ((ch.ap | 0) < cost) { Notifier.toast("Not enough AP."); return this.renderActions(); }
        return this.chooseAlly(ch, (ally) => {
          const d = ch.getDerived();
          const base = 4 + Math.floor((d.MAtk / 8) + (d.RES / 10));
          const healed = Math.max(0, Math.min(ally.maxHP - ally.hp, base));
          ally.hp = Math.min(ally.maxHP, ally.hp + base);
          if (healed > 0) this._bumpHeal(ch.id, ally.id, healed);
          this.log(`${ch.name} heals ${ally.name} for ${healed}.`);
          ch.ap -= cost; this.render(); (ch.ap <= 0) ? this._endTurn(0) : this.renderActions();
        });
      }

      default:
        Notifier.toast("Ability not implemented (yet).");
        return this.renderActions();
    }
  },

  _targetEnemy(ch, fn) {
    const wrap = document.getElementById("combat-actions"); wrap.innerHTML = "";
    this.livingEnemies().forEach(en => wrap.appendChild(actionBtn(`→ ${en.name || en.key}`, () => fn(en))));
    wrap.appendChild(actionBtn("Back", () => this.renderActions()));
  },

  // ---------- basic attack ----------
  doAttack(attacker, target, apCost = 1) {
    if (!this._currentChar || attacker.id !== this._currentChar.id) return;
    if ((attacker.ap | 0) < apCost) { Notifier.toast("Not enough AP."); return; }

    const aD = attacker.getDerived();
    const { damage, crit } = physDamage(
      { atk: aD.PAtk, dmg: [1, 6], side: "ally" },
      { def: target.def ?? 0, dmg: target.dmg || [1,4], side: "enemy" },
      1.0
    );
    this.damageFoe(target, damage);
    this._bumpDamage(attacker.id, target.id || null, damage);
    try { AudioManager.play?.("hit"); } catch {}
    this.log(`${nameOf(attacker)} hits ${nameOf(target)} for ${damage}${crit ? " (CRIT)" : ""}.`);

    attacker.ap -= apCost;
    this.render();
    if (attacker.ap <= 0) this._endTurn(0); else this.renderActions();
  },

  // ---------- enemy AI ----------
  enemyAct(en) {
    if (!this.active) return;
    if (!this._currentEnt || this._currentEnt.id !== en.id) return;

    const targets = this.livingAllies(); if (!targets.length) return;
    const target = (en.ai === "lowest")
      ? [...targets].sort((a, b) => a.hp - b.hp)[0]
      : Utils.choice(targets);

    // spend all AP on swings
    let swings = Math.max(1, Math.min(3, en.ap | 0));
    while (swings-- > 0 && target.hp > 0) {
      const { damage, crit } = physDamage(
        { atk: en.atk ?? 4, dmg: en.dmg || [1,4], side: "enemy" },
        { def: target.getDerived().DEF ?? 0, dmg: [1,2], side: "ally" },
        1.0
      );
      target.hp = Math.max(0, target.hp - damage);
      this._bumpDamage(en.id || null, target.id || null, damage);
      try { AudioManager.play?.("hit"); } catch {}
      this.log(`${en.name || en.key} hits ${target.name} for ${damage}${crit ? " (CRIT)" : ""}.`);
      if (target.hp <= 0) break;
    }

    this.render();
    this._endTurn(0);
  },

  // ---------- end / rewards ----------
  checkEnd() {
    const allies = this.livingAllies();
    const foes = this.livingEnemies();

    if (allies.length === 0) {
      this.log("Your party falls…");
      Notifier.toast("Defeat.");
      try { AudioManager.play?.("defeat"); } catch {}
      this.active = null;
      Storage.save();
      return;
    }
    if (foes.length === 0) {
      const xp = Utils.rand(30, 60);
      const gold = Utils.rand(5, 12);
      const loot = [];
      if (Utils.rand(1, 100) <= 30) {
        addItem("minor_tonic", 1);
        loot.push("Minor Tonic ×1");
      }
      addGold(gold);
      grantXP(xp);
      Storage.save();

      this._lastRewards = { xp, gold, loot };
      try { AudioManager.play?.("victory"); } catch {}
      this.showPostBattleSummary();
      return;
    }
  },

  showPostBattleSummary() {
    const ov = document.getElementById("postbattle-overlay");
    const list = document.getElementById("post-summary");
    const sumGold = document.getElementById("sum-gold");
    const sumXP = document.getElementById("sum-xp");
    const sumItems = document.getElementById("sum-items");
    const finish = document.getElementById("post-finish");
    if (!ov || !list) return;

    sumGold && (sumGold.textContent = String(this._lastRewards?.gold ?? 0));
    sumXP && (sumXP.textContent = String(this._lastRewards?.xp ?? 0));
    sumItems && (sumItems.textContent = this._lastRewards?.loot?.length ? this._lastRewards.loot.join(", ") : "—");

    list.innerHTML = "";
    (State.party || []).forEach(p => {
      const s = this._stats?.[p.id] || { dealt: 0, taken: 0, healGiven: 0, healReceived: 0 };
      const row = document.createElement("div");
      row.className = "stat";
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
      const el = document.getElementById("combat-log"); if (el) el.innerHTML = "";
      ov.classList.add("is-hidden"); ov.setAttribute("aria-hidden", "true");
      this.active = null;
      Notifier.goto("town");
    };

    ov.classList.remove("is-hidden");
    ov.setAttribute("aria-hidden", "false");
  },

  tryFlee() {
    if (Utils.rand(1, 100) <= 50) {
      Notifier.toast("You flee successfully.");
      this.active = null;
      Storage.save();
      Notifier.goto("town");
    } else {
      Notifier.toast("Could not escape!");
      this.render();
    }
  },

  log(msg) {
    const el = document.getElementById("combat-log");
    const p = document.createElement("p");
    p.textContent = msg;
    el?.appendChild(p);
    if (el) el.scrollTop = el.scrollHeight;
  }
};

export default Combat;
