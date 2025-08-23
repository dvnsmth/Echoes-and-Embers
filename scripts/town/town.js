// town.js — aggregator for town locations/buildings
import * as Square from './town/square.js';
import * as Inn from './town/inn.js';
import * as Market from './town/market.js';
import * as Gate from './town/gate.js';
import * as Blacksmith from './town/blacksmith.js';

// Export a single Town surface so existing calls like Scenes.market() still work
export const Town = {
  ...Square,     // townSquare()
  ...Inn,        // inn()
  ...Market,     // market()
  ...Gate,       // gate()
  ...Blacksmith, // blacksmith()
};

export default Town;
