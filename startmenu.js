import { State } from './state.js';
import { Storage } from './storage.js';
import { createCharacter } from './character.js';
import { UI } from './ui.js';

export const StartMenu = {
  el:null,
  init(){
    this.el = document.getElementById('start-overlay');
    this.show();

    this.el.addEventListener('click', (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLElement)) return;

      if (t.id === 'btnNewGame') {
        localStorage.removeItem('hollowvale-save');
        Object.assign(State,{party:[],gold:20,inventory:{},quests:{},flags:{}});
        UI.refreshParty(); UI.refreshSheet();
        this.hide();
        UI.goto('create');
      }
      if (t.id === 'btnContinue') {
        if(Storage.hasSave()){ Storage.load(); this.hide(); UI.goto('menu'); }
        else { UI.toast('No save found. Start a new game.'); }
      }
      if (t.id === 'btnCloseStart') {
        this.hide();
      }
      // Quick Start and Help removed
    });

    const cont=document.getElementById('btnContinue');
    if(!Storage.hasSave()){
      cont.disabled=true; cont.title='No save found';
    }
  },
  show(){ this.el.classList.remove('is-hidden'); this.el.setAttribute('aria-hidden','false'); },
  hide(){ this.el.classList.add('is-hidden'); this.el.setAttribute('aria-hidden','true'); }
};
