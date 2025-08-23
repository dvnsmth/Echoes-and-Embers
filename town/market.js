// /town/market.js
import { panelLog, actionsEl, btn } from './helpers.js';
import { Notifier } from '../state.js';
import { spendGold } from '../party.js';
import { addItem } from '../inventory.js';
import { Storage } from '../storage.js';

export function market(){
  try { setLocationMedia && setLocationMedia('Market'); } catch(e){}
  panelLog('Stalls offer herbs and ironmongery. A traveling tinker smiles.', true);

  const acts = actionsEl();
  acts.appendChild(btn('Buy Minor Tonic (5g)',()=>{
    if (!spendGold(5)) return Notifier.toast('Not enough gold');
    addItem('Minor Tonic',1);
    Storage.save();
  }));
  acts.appendChild(btn('Sell trinkets (+30g)',()=>{
    const { State } = requireState();
    State.gold = (State.gold||0) + 30; Storage.save(); Notifier.refresh();
  }));
}

// small helper to lazy-import state when needed
function requireState(){ return { State: (window.State || (awaitImport())) }; }
function awaitImport(){ /* noop – at runtime State is already global from your boot */ }
