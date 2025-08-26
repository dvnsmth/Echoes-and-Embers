// /town/gate.js — Wilderness gate (no cave here)
import { panelLog, actionsEl, btn, log } from './helpers.js';
import { Utils } from '../systems/utils.js';
import { addItem } from '../systems/inventory.js';
import { Storage } from '../systems/storage.js';
import { Combat } from '../systems/combat/combat.js';

export function gate(){
  try { setLocationMedia && setLocationMedia('Wilderness'); } catch(e){}
  const out = panelLog('Beyond the gate, deer paths lead into the pine-dark.', true);

  const acts = actionsEl();
  acts.appendChild(btn('Forage (chance for item)', ()=>{
    if (Utils.rand(1,100) <= 50){
      addItem('Minor Tonic',1);
      log(out,'You find a sprig of moonwort. Distillable. (+1 Minor Tonic)');
    } else {
      log(out,'Tracks and pinecones. Nothing more.');
    }
    Storage.save();
  }));

  acts.appendChild(btn('Patrol (encounter)', ()=>{
    Combat.start([{type:'Wolf'}]);
  }));
}
