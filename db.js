// db.js — aggregator so legacy imports keep working
import { races } from './race.js';
import { classes } from './class.js';

export const DB = { races, classes };
export { races, classes };
export default DB;

// main.js
