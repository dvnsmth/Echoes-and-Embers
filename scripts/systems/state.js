export const State = { party: [], gold: 20, inventory: {}, quests: {}, flags: {} };

export const Notifier = {
  toast: (msg)=>console.log('[toast]', msg),
  goto: (id)=>console.log('[goto]', id),
  refresh: ()=>{}
};

export const Settings = {
  key: 'hollowvale-settings',
  data: { textSize: 16, theme: 'dark', muted: false, reduced: false },
  load(){
    try{
      const raw=localStorage.getItem(this.key);
      if(raw){ this.data = Object.assign(this.data, JSON.parse(raw)); }
    }catch(e){}
    this.apply();
  },
  save(){
    localStorage.setItem(this.key, JSON.stringify(this.data));
    Notifier.toast('Settings saved.');
  },
  apply(){
    document.documentElement.style.fontSize = (this.data.textSize||16) + 'px';
    if(this.data.theme === 'light'){ document.body.classList.add('light'); } else { document.body.classList.remove('light'); }
    document.documentElement.style.setProperty('--reduced', this.data.reduced ? '1' : '0');
  },
  reset(){
    this.data = { textSize: 16, theme: 'dark', muted: false, reduced: false };
    this.apply();
  }
};
