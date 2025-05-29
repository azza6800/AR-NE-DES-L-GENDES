import { Arena } from './arena.js';
import { CombatSystem } from './combat.js';

export let arena = null;
export let combatSystem = null;

export function setInstances(newArena, newCombatSystem) {
    arena = newArena;
    combatSystem = newCombatSystem;
}
