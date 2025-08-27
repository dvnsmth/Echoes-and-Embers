// /scripts/town/blacksmith.js
import { panelLog, actionsEl, btn, log } from "./helpers.js";
import { Notifier } from "../systems/state.js";
import { spendGold } from "../systems/party.js";
import { addItem, getItemData, priceOf } from "../systems/inventory.js";

// Smith's catalog (IDs from data/weapons.js and data/items.js)
const SMITH_STOCK = [
  "iron_sword",
  "dagger",
  "hunting_bow",
  "wooden_shield",
  "leather_armor"
];

export function blacksmith() {
  try { setLocationMedia?.("Market"); } catch {}

  const out = panelLog(
    "The smithy rings with hammerblows. <b>Rhett Ironspan</b> eyes your gear.",
    true
  );
  const acts = actionsEl();

  for (const id of SMITH_STOCK) {
    const it = getItemData(id);
    if (!it) continue;

    acts.appendChild(
      btn(`${it.icon ?? "⚒️"} Buy ${it.name} (${priceOf(id)}g)`, () => {
        const cost = priceOf(id);
        if (!spendGold(cost)) return Notifier.toast("Not enough gold");
        addItem(id, 1);
        log(out, `You purchase ${it.name}.`);
      })
    );
  }
}

export default { blacksmith };
