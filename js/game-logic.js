import { Arena } from './arena.js'; // <-- ajout de l'import
import { CombatSystem } from './combat.js'; // pareil si besoin
import { arena, combatSystem, setInstances } from './main-instances.js';
import { initEventListeners } from './event-listeners.js';
import { showScreen , updateDisplay} from './ui-manager.js';
import { GAME_STATES } from './constants.js';
import { HEROES } from './heroes.js';
import { gameState } from './game_state.js';
import {startDiceRollPhase} from './game-phases.js';


export function initGame() {
    const newArena = new Arena();
    const newCombatSystem = new CombatSystem(newArena, gameState);
    setInstances(newArena, newCombatSystem);
    initEventListeners();
    showScreen(GAME_STATES.SELECT_PLAYERS);

    // Met à jour l'affichage de l'arène si nécessaire
    newArena.render();  // ou la fonction d'affichage que tu utilises
}



export function getCurrentPlayer() {
    return gameState.turnOrder[gameState.currentPlayerIndex];
}

export function selectHero(heroKey) {
    const hero = { 
        ...HEROES[heroKey], 
        playerNumber: gameState.currentPlayerSelecting 
    };
    
    gameState.selectedHeroes.push({
        player: gameState.currentPlayerSelecting,
        hero: hero
    });

    if (shouldSelectNextPlayer()) {
        selectNextPlayer();
    } else {
        startDiceRollPhase();
    }
}

function shouldSelectNextPlayer() {
    return gameState.currentPlayerSelecting < gameState.playerCount;
}

function selectNextPlayer() {
    gameState.currentPlayerSelecting++;
    updateDisplay('currentPlayer', `(Joueur ${gameState.currentPlayerSelecting})`);
}

export function restartGame() {
    resetGameState();
    arena = new Arena();
    showScreen(GAME_STATES.SELECT_PLAYERS);
}