// atb.js
import { BASE_AP_PER_TURN, AP_CARRY_CAP_DEFAULT, atbTime } from './stats.js';

export class ATBController {
  constructor({ pauseMode = true } = {}) {
    this.clock = 0;
    this.entities = []; // { id, name, getDEX, onTurnStart, onTurnEnd, apCarry, ready }
    this.pauseMode = pauseMode;
    this.readyQueue = []; // entity ids when turn-ready
  }

  addEntity(ent) {
    ent._atb = 0;
    ent._atbFill = () => atbTime(ent.getStats().DEX); // pull live DEX
    ent.apCarry = ent.apCarry ?? 0;
    ent.apCarryCap = ent.apCarryCap ?? AP_CARRY_CAP_DEFAULT;
    ent.ready = false;
    this.entities.push(ent);
  }

  tick(dt) {
    if (this.pauseMode && this.readyQueue.length) return; // freeze when someone is ready
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
    // compute AP pool
    const ap = BASE_AP_PER_TURN + Math.min(ent.apCarry, ent.apCarryCap);
    ent.ap = ap;
    ent.ready = true;
    if (ent.onTurnStart) ent.onTurnStart(ent);
    return ent;
  }

  endTurn(ent, { carry = 0 } = {}) {
    ent.apCarry = Math.min(ent.apCarryCap, carry);
    ent._atb = 0;
    ent.ready = false;
    if (ent.onTurnEnd) ent.onTurnEnd(ent);
  }
}
