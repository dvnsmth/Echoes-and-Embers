// /town/inn.js
import { panelLog, actionsEl, btn, log } from './helpers.js';
import { Notifier, State } from '../state.js';
import { spendGold } from '../party.js';
import { Storage } from '../storage.js';

export function inn(){
  try { setLocationMedia && setLocationMedia('Inn'); } catch(e){}
  const out = panelLog('The inn hums with low talk. The keeper, <b>Merren</b>, polishes a mug and nods.', true);

  const acts = actionsEl();
  acts.appendChild(btn('Ask for rumors',()=>log(out,'Merren: “Bandits avoid the cave lately. Says the goblins parley with a masked one.”')));

  acts.appendChild(btn('Hire a local (10g)', ()=>{
    if ((State.party?.length||0) >= 4) return Notifier.toast('Your party is full.');
    if (!spendGold(10)) return Notifier.toast('Not enough gold.');
    import('../character.js').then(({ createCharacter })=>{
      const hire = createCharacter({
        name:'Nia of the Vale', race:'Human', clazz:'Ranger', bg:'Scout',
        stats:{ STR:9, DEX:30, CON:8, INT:10, WIS:11, LCK:30 }
      });
      State.party.push(hire);
      Notifier.refresh();
      log(out,'Nia joins your cause. “I know the deer tracks to the cave.”');
      Storage.save();
    });
  }));
}
