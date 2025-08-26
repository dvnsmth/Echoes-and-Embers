// /scripts/town/market.js
import { panelLog, actionsEl, btn } from "./helpers.js";
import { Notifier } from "systems/state.js";
import { spendGold } from "systems/party.js";
import { addItem, getItemData, priceOf } from "systems/inventory.js";

// Choose what this vendor sells (IDs from data/)
const MARKET_STOCK = ["minor_tonic", "torch", "sturdy_rope"];

export function market() {
  try { setLocationMedia?.("Market"); } catch {}
  panelLog("Stalls offer herbs and ironmongery. A traveling tinker smiles.", true);

  const acts = actionsEl();

  for (const id of MARKET_STOCK) {
    const it = getItemData(id);
    if (!it) continue;

    acts.appendChild(btn(
      `${it.icon ?? "🛒"} Buy ${it.name} (${priceOf(id)}g)`,
      () => {
        const cost = priceOf(id);
        if (!spendGold(cost)) return Notifier.toast("Not enough gold");
        addItem(id, 1);
        Notifier.toast(`Purchased: ${it.name}`);
      }
    ));
  }

  // Simple demo sell action; replace with a full sell UI later if desired
  acts.appendChild(btn("Sell trinkets (+30g)", () => {
    State.gold = (State.gold || 0) + 30;
    Notifier.refresh(); Notifier.toast("Sold a handful of curios.");
  }));
}

export default { market };
