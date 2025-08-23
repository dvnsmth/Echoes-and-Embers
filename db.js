// db.js — aggregator so legacy imports keep working
import { races } from './scripts/data/race.js';
import { classes } from './scripts/data/class.js';

export const DB = { races, classes };
export { races, classes };
export default DB;

// main.js
