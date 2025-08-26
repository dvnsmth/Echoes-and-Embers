// quests/lostcanyon.js — example quest: Lost Canyon
import { Dialogue } from '../ui/dialogue.js';
import { Notifier } from '../state.js';
import { Combat } from '../combat.js';
import { addItem } from '../../inventory.js';
import { startQuest, setStage, completeQuest, getQuest } from './core.js';

export const LOST_CANYON_ID = 'Q_LOST_CANYON';

export function offer() {
  const q = startQuest(LOST_CANYON_ID, { name: 'Lost Canyon', stage: 0, recommended: [3, 6] });
  Dialogue.show(
    'Caravan Master',
    `“Our wagons vanished in the <b>Lost Canyon</b>. Bring back the ledger and I’ll make it worth your while.”`,
    [
      { label: 'Accept (mark canyon on map)', on: () => { setStage(LOST_CANYON_ID, 1); Notifier.toast('Quest started: Lost Canyon'); Dialogue.back(); } },
      { label: 'Decline', on: () => Dialogue.back() },
    ],
    'town'
  );
  return q;
}

export function canyonEntrance() {
  setStage(LOST_CANYON_ID, 2);
  Dialogue.show(
    'Canyon Rim',
    `Sandstone walls plunge into shadow. Tracks skitter along narrow ledges.`,
    [
      { label: 'Climb down (encounter)', on: () => { Notifier.goto('combat'); Combat.start([{type:'Gnoll'},{type:'Gnoll'}]); } },
      { label: 'Scout around (find a rope)', on: () => { addItem('Sturdy Rope'); Notifier.toast('Found: Sturdy Rope'); Dialogue.back(); } },
      { label: 'Leave', on: () => Dialogue.back() },
    ],
    'town'
  );
}

export function bossLedge() {
  setStage(LOST_CANYON_ID, 3);
  Dialogue.show(
    'Thief-King’s Ledge',
    `A masked bandit captain glares. “The ledger buys lives. Yours, perhaps.”`,
    [
      { label: 'Fight the Thief-King', on: () => { Notifier.goto('combat'); Combat.start([{type:'Bandit Captain'},{type:'Bandit'},{type:'Bandit'}]); } },
      { label: 'Bargain (give 20g)', on: () => { completeQuest(LOST_CANYON_ID, { xp: 140, gold: 0, peaceful: true }); Dialogue.back(); } },
    ],
    'town'
  );
}

export const LostCanyonQuest = {
  id: LOST_CANYON_ID,
  name: 'Lost Canyon',
  offer,
  canyonEntrance,
  bossLedge,
  get: () => getQuest(LOST_CANYON_ID),
};

export default LostCanyonQuest;
