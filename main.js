import { UI, SettingsUI } from './ui.js';
import { Settings } from './state.js';
import { StartMenu } from './startMenu.js';
import { Scenes, Dialogue } from './scenes.js';
import { Combat } from './combat.js';
import { Sheet } from './sheet.js';

window.UI = UI;
window.SettingsUI = SettingsUI;
window.Scenes = Scenes;
window.Dialogue = Dialogue;
window.Combat = Combat;
window.Sheet = Sheet;
window.Settings = Settings;

window.addEventListener('DOMContentLoaded', ()=>{
  UI.init();
  Settings.load();
  SettingsUI.init();
  StartMenu.init();
});
