// /town/square.js — Town Square (no quest logic here)
import { panelLog, actionsEl, btn, log } from './helpers.js';
import { Hollowroot } from '../quests/quest.js';
import { openJournal } from '../quests/journal.js';

export function townSquare(){
  try { setLocationMedia && setLocationMedia('Town Square'); } catch(e){}

  const out = panelLog(
    'You stand before the notice board. A ranger, <b>Edda Greenbriar</b> (🧭), watches the treeline.'
  );
  const acts = actionsEl();

  // Edda: owned by the Hollowroot quest module
  acts.appendChild(btn('Speak with Edda', ()=>Hollowroot.offer()));
  acts.appendChild(btn('Open Quest Journal', ()=>openJournal()));
  acts.appendChild(btn('Check the notice board', ()=>log(out,'A faded parchment reads: “<i>Hollowroot goblins grow bold. Reward for peace or steel.</i>”')));
}
