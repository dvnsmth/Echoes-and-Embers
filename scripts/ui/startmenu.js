// ui/startmenu.js — clean, self-contained start overlay
import { AudioManager } from "systems/audio.js";
import { State } from "systems/state.js";
import { Storage } from "systems/storage.js";
import { UI } from "ui/ui.js";
import { setRegion, loadRegionFromSave } from "systems/world.js";

export const StartMenu = {
  el: null,

  init() {
    this.el = document.getElementById("start-overlay");
    if (!this.el) return;

    // initial paint
    this.show();
    const cont = document.getElementById("btnContinue");
    if (cont && !Storage.hasSave?.()) { cont.disabled = true; cont.title = "No save found"; }

    this.el.addEventListener("click", (e) => {
      const t = e.target; if (!(t instanceof HTMLElement)) return;

      if (t.id === "btnNewGame") {
        try { AudioManager.play?.("select"); } catch {}
        // wipe save & seed base state
        Storage.clear?.();
        Object.assign(State, { party: [], gold: 20, inventory: {}, quests: {}, flags: {} });
        setRegion("Thornbridge");
        UI.refreshParty?.(); UI.refreshSheet?.();
        this.hide();
        UI.goto?.("create");
      }

      if (t.id === "btnContinue") {
        try { AudioManager.play?.("select"); } catch {}
        if (Storage.hasSave?.()) {
          Storage.load?.();
          loadRegionFromSave();
          this.hide();
          UI.goto?.("menu");
        } else {
          UI.toast?.("No save found. Start a new game.");
        }
      }

      if (t.id === "btnCloseStart") {
        try { AudioManager.play?.("select"); } catch {}
        this.hide();
      }
    });
  },

  show(){ this.el.classList.remove("is-hidden"); this.el.setAttribute("aria-hidden","false"); },
  hide(){ this.el.classList.add("is-hidden");    this.el.setAttribute("aria-hidden","true"); },
};

export default StartMenu;
