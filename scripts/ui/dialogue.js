// dialogue.js — UI wrapper for showing dialogue nodes
import { Notifier } from '../systems/state.js';

export const Dialogue = {
  show(name, html, choices, back = 'town') {
    window.UI && (window.UI._dlgBack = back);
    document.getElementById('dlg-name').textContent = name;
    document.getElementById('dlg-text').innerHTML = html;
    
    const wrap = document.getElementById('dlg-choices');
    wrap.innerHTML = '';
    for (const c of choices) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = c.label;
      b.onclick = c.on;
      wrap.appendChild(b);
    }
    Notifier.goto('dialogue');
  },
  back() {
    if (window.UI?.backFromDialogue) window.UI.backFromDialogue();
  },
};

export default Dialogue;
