// /town/helpers.js — shared helpers for town screens

export function btn(label, onClick) {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = label;
  b.onclick = onClick;
  return b;
}

export function panelLog(html, withBack = false, backFn = null){
  const out = document.getElementById('town-output');
  out.innerHTML = '';

  const parent = out.parentElement;
  const old = parent.querySelector('#town-actions');
  if (old) old.remove();

  const p = document.createElement('p');
  p.innerHTML = html;
  out.appendChild(p);

  const actions = document.createElement('div');
  actions.className = 'choice-list';
  actions.id = 'town-actions';
  parent.appendChild(actions);

  if (withBack){
    actions.appendChild(btn('⬅ Town Square', backFn || (() => import('../town.js').then(m=>m.Town.townSquare()))));
  }
  return out;
}

export function actionsEl(){ return document.getElementById('town-actions'); }

export function log(out, html){
  const p = document.createElement('p');
  p.innerHTML = html;
  out.appendChild(p);
  out.scrollTop = out.scrollHeight;
}
