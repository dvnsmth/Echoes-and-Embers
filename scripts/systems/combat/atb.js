// /scripts/systems/combat/atb.js
import { BASE_AP_PER_TURN, AP_CARRY_CAP_DEFAULT, atbTime } from "../../data/stats.js";

export class ATBController {
  constructor({ pauseMode = true } = {}) {
    this.clock = 0;
    this.entities = [];     // { id, side, name, getStats, onTurnStart, onTurnEnd, apCarry, apCarryCap, ready }
    this.pauseMode = pauseMode;
    this.readyQueue = [];   // entity objects when turn-ready
  }

  addEntity(ent) {
    ent._atb = 0;
    ent._atbFill = () => atbTime(ent.getStats().DEX);
    ent.apCarry = ent.apCarry ?? 0;
    ent.apCarryCap = ent.apCarryCap ?? AP_CARRY_CAP_DEFAULT;
    ent.ready = false;
    this.entities.push(ent);
  }

  tick(dt) {
    if (this.pauseMode && this.readyQueue.length) return;
    for (const e of this.entities) {
      if (e.ready) continue;
      e._atb += dt;
      const need = e._atbFill();
      if (e._atb >= need) {
        e.ready = true;
        this.readyQueue.push(e);
      }
    }
  }

  hasTurnReady() { return this.readyQueue.length > 0; }

  popTurn() {
    const ent = this.readyQueue.shift();
    if (!ent) return null;
    const ap = BASE_AP_PER_TURN + Math.min(ent.apCarry, ent.apCarryCap);
    ent.ap = ap;
    ent.ready = true;
    ent.onTurnStart?.(ent);
    return ent;
  }

  endTurn(ent, { carry = 0 } = {}) {
    ent.apCarry = Math.min(ent.apCarryCap, carry);
    ent._atb = 0;
    ent.ready = false;
    ent.onTurnEnd?.(ent);
  }
}
