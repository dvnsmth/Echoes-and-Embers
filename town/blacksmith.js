// /town/blacksmith.js — example building
import { panelLog, actionsEl, btn, log } from './helpers.js';
import { Notifier } from '../state.js';
import { spendGold } from '../party.js';
import { addItem } from '../inventory.js';
import { Storage } from '../storage.js';

export function blacksmith(){
  try { setLocationMedia && setLocationMedia('Market'); } catch(e){}
  const out = panelLog('The smithy rings with hammerblows. <b>Rhett Ironspan</b> eyes your gear.', true);

  const acts = actionsEl();

  acts.appendChild(btn('Buy Iron Sword (20g)', ()=>{
    if (!spendGold(20)) return Notifier.toast('Not enough gold');
    addItem('Iron Sword', 1);
    log(out, 'You purchase a well-balanced iron sword.');
    Storage.save();
  }));

  acts.appendChild(btn('Buy Wooden Shield (15g)', ()=>{
    if (!spendGold(15)) return Notifier.toast('Not enough gold');
    addItem('Wooden Shield', 1);
    log(out, 'Rhett passes you a sturdy, if plain, shield.');
    Storage.save();
  }));

  acts.appendChild(btn('Repair gear (2g)', ()=>{
    if (!spendGold(2)) return Notifier.toast('Not enough gold');
    log(out, 'Rhett hones edges and oils leather. (Repairs complete.)');
    Storage.save();
  }));
}
