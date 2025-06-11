import { Arena } from './arena.js';
import { HEROES } from './heroes.js';
import { lancerDe, updateCooldowns, resetSpecialEffects } from './utils.js';
import { CombatSystem } from './combat.js';
import { ACTIONS, GAME_STATES, ATTACK_TYPES } from './constants.js';
import { initEventListeners } from './event-listeners.js';
import {initGame} from './main.js';


// État global du jeu
export let gameState = {
    currentState: GAME_STATES.SELECT_PLAYERS,
    playerCount: 0,
    currentPlayerSelecting: 1,
    selectedHeroes: [],
    turnOrder: [],
    currentTurn: 1,
    currentPlayerIndex: 0,
    combatLog: [],
    currentAction: null,
    selectedCell: null,
    hasPerformedAction: false,
    hasMovedThisTurn: false,
    hasAttacked: false,
    currentPhase: 'ACTION',
    adjacentEnemies: null,
    hasDoubleAttack: false,
    hasUsedSpecial: false,
    hasDefended: false,
    isPaused: false
};




export function restartGame() {
    gameState = {
        currentState: GAME_STATES.INTRO,
        playerCount: 0,
        currentPlayerSelecting: 1,
        selectedHeroes: [],
        turnOrder: [],
        currentTurn: 1,
        currentPlayerIndex: 0,
        combatLog: [],
        currentAction: null,
        selectedCell: null,
        hasPerformedAction: false,
        hasMovedThisTurn: false,
        hasAttacked: false,
        currentPhase: 'ACTION',
        adjacentEnemies: null
    };
    initGame();
    
}