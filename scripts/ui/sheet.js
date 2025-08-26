// sheet.js
import { AudioManager } from './audio.js';
import { State, Notifier } from './state.js';

// NOTE: In the new model, DEF/RES/PAtk/etc. are computed from stats + gear via character.getDerived().
// We don't touch meta.armor/init anymore. We just change gear, invalidate the cache, and recompute.

function recomputeDerivedAndClampHP(ch) {
  // Invalidate any cached derived block so getDerived() recalculates
  if (ch.meta) ch.meta.derived = null;

  const d = ch.getDerived ? ch.getDerived() : null;
  if (d) {
    // maxHP follows derived HP; clamp current HP
    ch.maxHP = d.HP;
    if (typeof ch.hp === 'number') ch.hp = Math.max(0, Math.min(ch.hp, ch.maxHP));
  }
}

export const Sheet = {
  useTonic(id) {
    if (!State.inventory['Minor Tonic']) return Notifier.toast('No Minor Tonic.');
    const ch = State.party.find(c => c.id === id); if (!ch) return;
    const heal = 6;
    ch.hp = Math.min(ch.maxHP, (ch.hp || 0) + heal);
    State.inventory['Minor Tonic']--;
    if (State.inventory['Minor Tonic'] <= 0) delete State.inventory['Minor Tonic'];
    try { AudioManager.play('heal'); } catch {}
    Notifier.toast(`${ch.name} drinks a tonic (+${heal} HP).`);
    Notifier.refresh();
  },

  equip(id) {
    const ch = State.party.find(c => c.id === id); if (!ch) return;

    // Upgrade example: weapon bonus contributes to PAtk; armor ac contributes to DEF in derived math.
    // Tweak numbers as you like for your item tiers.
    ch.equips.weapon = { name: 'Steel Blade', dmg: [1, 8], bonus: 6 }; // weapon.bonus -> PAtk via derivedFrom
    ch.equips.armor  = { name: 'Leather',     ac: 4 };                  // armor.ac   -> DEF  via derivedFrom

    // Recompute derived + clamp HP to new max
    recomputeDerivedAndClampHP(ch);

    try { AudioManager.play('select'); } catch {}
    Notifier.toast(`${ch.name} equips better gear.`);
    Notifier.refresh();
  }
};
