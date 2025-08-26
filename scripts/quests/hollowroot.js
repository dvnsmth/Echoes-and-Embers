// quests/hollowroot.js
import { Dialogue } from '../ui/dialogue.js';
import { addItem } from '../../inventory.js';
import { Utils, calcMod } from '../utils.js';
import { State, Notifier } from '../state.js';
import { Combat } from '../combat.js';
import { startQuest, setStage, completeQuest, getQuest } from './core.js';

export const HOLLOWROOT_ID = 'Q_HOLLOWROOT';

export function offer() {
  const q = startQuest(HOLLOWROOT_ID, { name: 'Hollowroot Tensions', stage: 0 });
  Notifier.refresh();

  Dialogue.show(
    'Edda Greenbriar',
    `“Another band of travelers? Good. We need steady hearts.” She points toward the woods.<br><br>
     “Goblins haunt the <b>Hollowroot Cave</b>. Folks want them gone, but I’ve heard they’ll talk.
     Bring peace if you can. Failing that… protect the town.”`,
    [
      { label: 'Accept the quest', on: () => { setStage(HOLLOWROOT_ID, 1); Notifier.toast('Quest started: Hollowroot Tensions'); Dialogue.back(); } },
      { label: 'Ask for advice', on: () => Dialogue.show('Edda', '“Go light-footed. Words may spare blood.”', [{ label: 'Thanks', on: () => Dialogue.back() }], 'town') },
      { label: 'Open Quest Journal', on: () => import('./journal.js').then(m=>m.openJournal()) },
    ],
    'town'
  );
  return q;
}

export function caveEntrance(){
  setStage(HOLLOWROOT_ID, Math.max(getQuest(HOLLOWROOT_ID)?.stage || 1, 2));
  try { setLocationMedia && setLocationMedia('Cave Entrance'); } catch(e){}
  Dialogue.show(
    'Hollowroot Cave',
    'A root-torn cleft yawns in the hill. Drips echo. Torch-scars mark the stone.',
    [
      { label:'Parley with the goblins', on:()=>parley() },
      { label:'Scout around (encounter)', on:()=>{ Notifier.goto('combat'); Combat.start([{type:'Goblin'},{type:'Goblin'}]); } },
      { label:'Leave', on:()=>Notifier.goto('town') },
    ],
    'town'
  );
}

export function parley() {
  startQuest(HOLLOWROOT_ID, { name: 'Hollowroot Tensions' });
  setStage(HOLLOWROOT_ID, 2);

  Dialogue.show(
    'Goblin Envoy',
    `A goblin in a bone mask raises empty hands. “No fight. Mask-man makes us raid. We want <b>truce</b>.”`,
    [
      {
        label: 'Persuade a truce (WIS check)',
        on: () => {
          const partyWIS = Math.max(...(State.party || []).map(c => calcMod(c.stats?.WIS ?? 10)), 0);
          const roll = Utils.roll(20) + partyWIS;
          if (roll >= 12) {
            Dialogue.show('Goblin Envoy', '“Truce, then. We keep cave. No raids. Take this token.”', [
              { label: 'Take token & return', on: () => {
                  addItem('Goblin Token');
                  completeQuest(HOLLOWROOT_ID, { xp: 120, gold: 25, peaceful: true });
                  Notifier.goto('town');
                } }
            ], 'town');
          } else {
            Dialogue.show('Goblin Envoy', 'The envoy hesitates, then snarls. “No trust!”', [
              { label: 'It comes to blows…', on: () => { Notifier.goto('combat'); Combat.start([{type:'Goblin'},{type:'Goblin'},{type:'Goblin Captain'}]); } }
            ], 'town');
          }
        }
      },
      {
        label: 'Demand surrender (STR intimidate)',
        on: () => {
          const partySTR = Math.max(...(State.party || []).map(c => calcMod(c.stats?.STR ?? 10)), 0);
          const roll = Utils.roll(20) + partySTR;
          if (roll >= 14) {
            addItem('Goblin Token');
            completeQuest(HOLLOWROOT_ID, { xp: 120, gold: 25, peaceful: true });
            Notifier.goto('town');
          } else {
            Notifier.goto('combat');
            Combat.start([{type:'Goblin'},{type:'Goblin'}]);
          }
        }
      },
      { label:'Ambush them', on:()=>{ Notifier.goto('combat'); Combat.start([{type:'Goblin'},{type:'Goblin'},{type:'Goblin'}]); } },
      { label:'Leave', on:()=>Notifier.goto('town') },
    ],
    'town'
  );
}

export const HollowrootQuest = {
  id: HOLLOWROOT_ID,
  name: 'Hollowroot Tensions',
  offer,
  caveEntrance,
  parley,
  get: () => getQuest(HOLLOWROOT_ID),
};

export default HollowrootQuest;
