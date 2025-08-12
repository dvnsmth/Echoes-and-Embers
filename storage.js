import { State, Notifier } from './state.js';
import { DB } from './db.js';

export const Storage = {
  save(){
    const data = {v:DB.version, state:State};
    localStorage.setItem('hollowvale-save', JSON.stringify(data));
    Notifier.toast('Game saved.');
  },
  load(){
    const raw=localStorage.getItem('hollowvale-save');
    if(!raw) { Notifier.toast('No save found.'); return false; }
    try{
      const obj=JSON.parse(raw);
      if(obj && obj.state){
        Object.assign(State, obj.state);
        Notifier.toast('Loaded.');
        Notifier.refresh();
        return true;
      }
    }catch(e){
      console.error(e);
      Notifier.toast('Load failed.');
    }
    return false;
  },
  hasSave(){ return !!localStorage.getItem('hollowvale-save'); }
};
