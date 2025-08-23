import { Notifier, State } from './state.js';
import { grantXP, } from './character.js';
import {addGold, spendGold} from './party.js';
import { Utils, calcMod } from './utils.js';
import { Combat } from './combat.js';
import { Storage } from './storage.js';
import { addItem } from './inventory.js';


function btn(label,fn){ const b=document.createElement('button'); b.className='btn'; b.textContent=label; b.onclick=fn; return b; }

/**
 * Renders a fresh town location description and a fresh action area.
 * - Clears previous description and ALL previous action groups
 * - Creates a new `.choice-list` with id="town-actions"
 * - Adds a default "⬅ Town Square" button for sub-locations (opt-in)
 *
 * @param {string} line - HTML string for the location description
 * @param {boolean} withBack - whether to include a "Back to Town Square" button
 * @returns {HTMLElement} out - the #town-output element
 */
function panelLog(line, withBack = false){
  const out = document.getElementById('town-output');

  // Clear the description/log area
  out.innerHTML = '';

  // ✅ Only remove the dynamic actions container (if it exists), NOT the static nav
  const parent = out.parentElement;
  const oldActions = parent.querySelector('#town-actions');
  if (oldActions) oldActions.remove();

  // New description
  const p = document.createElement('p');
  p.innerHTML = line;
  out.appendChild(p);

  // Fresh actions container (dynamic)
  const actions = document.createElement('div');
  actions.className = 'choice-list';
  actions.id = 'town-actions';
  parent.appendChild(actions);

  // Optional back-to-square
  if(withBack){
    actions.appendChild(btn('⬅ Town Square', ()=>Scenes.townSquare()));
  }

  return out;
}

function actionsEl(){ return document.getElementById('town-actions'); }
function log(out, text){ const p=document.createElement('p'); p.innerHTML=text; out.appendChild(p); out.scrollTop = out.scrollHeight; }

function getOrStartQuest(id, data){
  if(!State.quests[id]) State.quests[id]=data; return State.quests[id];
}
function completeQuest(id, peaceful=false){
  const q=State.quests[id]; if(!q) return;
  q.status='done'; q.stage=999;
  const rewardXP = peaceful?120:150; const rewardGold = peaceful?25:40;
  addGold(rewardGold); grantXP(rewardXP);
  Notifier.toast(`Quest complete: ${q.name} (+${rewardGold}g, +${rewardXP} XP)`);
  Storage.save();               // autosave after quest completion
  Notifier.refresh();           // refresh UI/quest chip
}

export const Scenes = {
  townSquare(){
    // 🔊🎨 Update background + music for Town Square
    try { setLocationMedia && setLocationMedia('Town Square'); } catch(e){}

    const out = panelLog(
      'You stand before the notice board. A ranger, <b>Edda Greenbriar</b> (🧭), watches the treeline. She motions you over.'
    );
    const acts = actionsEl();
    acts.appendChild(btn('Speak with Edda',()=>Dialogue.eddaIntro()));
    acts.appendChild(btn('Check the notice board',()=>{ log(out,'A faded parchment reads: “<i>Hollowroot goblins grow bold. Reward for peace or steel.</i>”'); }));
  },

  inn(){
    // 🔊🎨 Inn ambience + art (fire + chatter)
    try { setLocationMedia && setLocationMedia('Inn'); } catch(e){}

    const out = panelLog('The inn hums with low talk. The keeper, <b>Merren</b>, polishes a mug and nods.', true);
    const acts = actionsEl();
    acts.appendChild(btn('Ask for rumors',()=>log(out,'Merren: “Bandits avoid the cave lately. Says the goblins parley with a masked one.”')));
    acts.appendChild(btn('Hire a local (10g)',()=>{
      if(State.party.length>=4) return Notifier.toast('Your party is full.');
      if(!spendGold(10)) return Notifier.toast('Not enough gold.');
      import('./character.js').then(({createCharacter})=>{
        const hire = createCharacter({name:'Nia of the Vale', race:'Human', clazz:'Ranger', bg:'Scout', stats:{STR:9,DEX:30,CON:8,INT:10,WIS:11,LCK:30}});
        State.party.push(hire); Notifier.refresh();
        log(out,'Nia joins your cause. “I know the deer tracks to the cave.”');
        Storage.save();
      });
    }));
  },

  market(){
    // 🔊🎨 Market ambience + music (layered)
    try { setLocationMedia && setLocationMedia('Market'); } catch(e){}

    panelLog('Stalls offer herbs and ironmongery. A traveling tinker smiles.', true);
    const acts = actionsEl();
    acts.appendChild(btn('Buy Minor Tonic (5g)',()=>{ if(!spendGold(5)) return Notifier.toast('Not enough gold'); addItem('Minor Tonic',1); Storage.save(); }));
    acts.appendChild(btn('Sell trinkets (+30g)',()=>{ addGold(30); Storage.save(); }));
  },

  gate(){
    // 🔊🎨 Wilderness ambience + music (layered)
    // NOTE: Keeping function name `gate()` for the button wiring, but media maps to "Wilderness".
    try { setLocationMedia && setLocationMedia('Wilderness'); } catch(e){}

    const out = panelLog('Beyond the gate, deer paths lead into the pine-dark.', true);
    const acts = actionsEl();
    acts.appendChild(btn('Forage (chance for item)',()=>{
      if(Utils.rand(1,100)<=50){ addItem('Minor Tonic',1); log(out,'You find a sprig of moonwort. Distillable. (+1 Minor Tonic)'); }
      else log(out,'Tracks and pinecones. Nothing more.');
      Storage.save();
    }));
    acts.appendChild(btn('Patrol (encounter)',()=>{
      Combat.start([{type:'Wolf'}]);
    }));
  },

  caveEntrance(){
    // 🔊🎨 Cave ambience + music (layered)
    try { setLocationMedia && setLocationMedia('Cave Entrance'); } catch(e){}

    panelLog('A root-torn cleft yawns in the hill. Drips echo. Torch-scars mark the stone.', true);
    const acts = actionsEl();
    acts.appendChild(btn('Enter the cave (quest)',()=>{
      Dialogue.goblinParley();
    }));
    acts.appendChild(btn('Scout around (encounter)',()=>Combat.start([{type:'Goblin'},{type:'Goblin'}])));
  },
};

export const Dialogue = {
  show(name, text, choices, back='town'){
    window.UI && (window.UI._dlgBack = back);
    document.getElementById('dlg-name').textContent=name;
    document.getElementById('dlg-text').innerHTML = text;
    const wrap = document.getElementById('dlg-choices'); wrap.innerHTML='';
    choices.forEach(c=>{
      const b=document.createElement('button'); b.className='btn'; b.textContent=c.label; b.onclick=c.on;
      wrap.appendChild(b);
    });
    Notifier.goto('dialogue');
  },
  eddaIntro(){
    const q = getOrStartQuest('Q_HOLLOWROOT', {name:'Hollowroot Tensions', stage:0, status:'active'});
    Notifier.refresh(); // update quest chip
    Dialogue.show('Edda Greenbriar',
      `“Another band of travelers? Good. We need steady hearts.” She points toward the woods.<br><br>
       “Goblins haunt the <b>Hollowroot Cave</b>. Folks want them gone, but I’ve heard they’ll talk. Bring peace if you can. Failing that… protect the town.”`,
      [
        {label:'Accept the quest', on:()=>{ q.stage=1; Notifier.toast('Quest started: Hollowroot Tensions'); Notifier.refresh(); window.UI?.backFromDialogue?.(); }},
        {label:'Ask for advice', on:()=>Dialogue.show('Edda', '“Go light-footed. Words may spare blood.”', [
          {label:'Thanks', on:()=>window.UI?.backFromDialogue?.()}], 'town')},
      ]
    );
  },
  goblinParley(){
    const q=getOrStartQuest('Q_HOLLOWROOT', {name:'Hollowroot Tensions', stage:1, status:'active'});
    Notifier.refresh();
    Dialogue.show('Goblin Envoy',
      `A goblin in a bone mask raises empty hands. “No fight. Mask-man makes us raid. We want <b>truce</b>.”`,
      [
        {label:'Persuade a truce (CHA check)', on:()=>{
          const partyCHA = Math.max(...State.party.map(c=>calcMod(c.stats.CHA)), 0);
          const roll = Utils.roll(20)+partyCHA;
          if(roll>=12){
            Dialogue.show('Goblin Envoy', '“Truce, then. We keep cave. No raids. Take this token.”', [
              {label:'Take token & return', on:()=>{ addItem('Goblin Token'); completeQuest('Q_HOLLOWROOT', true); Notifier.goto('town'); }}
            ]);
          } else {
            Dialogue.show('Goblin Envoy', 'The envoy hesitates, then snarls. “No trust!”', [
              {label:'It comes to blows…', on:()=>{ Notifier.goto('combat'); Combat.start([{type:'Goblin'},{type:'Goblin'},{type:'Goblin Captain'}]); }}
            ]);
          }
        }},
        {label:'Demand surrender (INTIMIDATE STR)', on:()=>{
          const s = Math.max(...State.party.map(c=>calcMod(c.stats.STR)),0);
          const roll = Utils.roll(20)+s;
          if(roll>=14){ addItem('Goblin Token'); completeQuest('Q_HOLLOWROOT', true); Notifier.goto('town'); }
          else { Notifier.goto('combat'); Combat.start([{type:'Goblin'},{type:'Goblin'}]); }
        }},
        {label:'Ambush them', on:()=>{ Notifier.goto('combat'); Combat.start([{type:'Goblin'},{type:'Goblin'},{type:'Goblin'}]); }},
        {label:'Leave quietly', on:()=>Notifier.goto('town')},
      ], 'town');
  },
};
TriggerEncounterPreset('forest_road_t1'); // quick forest fight
// or
TriggerEncounterTable('crypt_undead_t2'); // handcrafted recipe
