import { GAME_STATES } from './constants.js';

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
    adjacentEnemies: null
};

export function resetGameState() {
    gameState = {
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
        adjacentEnemies: null
    };
}