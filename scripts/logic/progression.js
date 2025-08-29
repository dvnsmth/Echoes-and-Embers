import { on, emit } from "events/bus.js";
import { EV } from "events/types.js";
import { getTown, setBuildingLevel, bumpVendorTier, setFlag } from "state/townState.js";
import BDATA from "data/buildings.json" with { type: "json" };

// Helper to apply building tier effects from data
function applyBuildingEffects(key, tier){
  const tierDef = BDATA[key]?.tiers?.[String(tier)];
  if (!tierDef?.effects) return;

  const { vendorTier, flag, discountPct, unlock } = tierDef.effects;

  if (vendorTier) {
    for (const shop in vendorTier) bumpVendorTier(shop, vendorTier[shop] - (getTown().vendorTiers[shop] ?? 0));
  }
  if (flag) flag.forEach(f => setFlag(f, true));

  // You can broadcast discounts/unlocks to UI if needed
  if (discountPct) emit(EV.UITost, { text: `${BDATA[key].name}: Discounts now ${discountPct}%` });
  if (unlock?.length) emit(EV.UITost, { text: `${BDATA[key].name} unlocked: ${unlock.join(", ")}` });
}

// Upgrade building API (can be called by quests, results, or buttons)
export function upgradeBuilding(key, toTier){
  const newTier = setBuildingLevel(key, toTier);
  applyBuildingEffects(key, newTier);
  emit(EV.BuildingUpgraded, { key, level: newTier });
  return newTier;
}

// Event wiring examples

// Win certain battles → unlock blacksmith tier 1
on(EV.BattleWon, ({ summary }) => {
  if (summary?.tags?.includes?.("LostCanyonBoss")) {
    upgradeBuilding("blacksmith", 1);
  }
});

// Quest progress can unlock Temple
on(EV.QuestAdvanced, ({ id, stage }) => {
  if (id === "Sanctum" && stage >= 2) {
    upgradeBuilding("temple", 1);
  }
});

// Region unlock could raise Market tier
on(EV.RegionUnlocked, ({ key }) => {
  if (key === "CharredForest") {
    const current = getTown().vendorTiers.market ?? 1;
    if (current < 2) bumpVendorTier("market", 2 - current);
    emit(EV.BuildingUpgraded, { key: "market", level: getTown().buildings.market ?? 1 });
  }
});
