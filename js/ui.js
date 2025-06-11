import { Arena } from './arena.js';
import { HEROES } from './heroes.js';
import { lancerDe, updateCooldowns, resetSpecialEffects } from './utils.js';
import { CombatSystem } from './combat.js';
import { ACTIONS, GAME_STATES, ATTACK_TYPES } from './constants.js';
import { initEventListeners } from './event-listeners.js';

// Éléments UI
export const uiElements = {
    screens: {
        Intro: document.getElementById('intro-screen'),
        playerSelection: document.getElementById('player-selection'),
        heroSelection: document.getElementById('hero-selection'),
        diceRollScreen: document.getElementById('dice-roll-screen'),
        gameArena: document.getElementById('game-arena'),
        victoryScreen: document.getElementById('victory-screen'),
        attackRollScreen: document.getElementById('attack-roll-screen')
    },
    buttons: {
        startgame: document.getElementById('start-game-btn'),
        move: document.getElementById('move-btn'),
        attack: document.getElementById('attack-btn'),
        special: document.getElementById('special-btn'),
        defend: document.getElementById('defend-btn'),
        endTurn: document.getElementById('end-turn-btn'),
        rollDice: document.getElementById('roll-dice-btn'),
        restart: document.getElementById('restart-btn'),
        attackRoll: document.getElementById('attack-roll-button')
    },
    displays: {
        currentPlayer: document.getElementById('current-player-display'),
        rollingPlayer: document.getElementById('current-rolling-player'),
        turnInfo: document.getElementById('turn-info'),
        victoryMessage: document.getElementById('victory-message'),
        combatLog: document.getElementById('combat-log'),
        dice: document.getElementById('dice'),
        rollResults: document.getElementById('roll-results'),
        attackDice: document.getElementById('attack-dice'),
        attackRollAttacker: document.getElementById('attack-roll-attacker'),
        attackRollDefender: document.getElementById('attack-roll-defender')
    }
};
// Ajoutez en haut du fichier, après les autres déclarations
export const soundEffects = {
    elimination: document.getElementById('elimination-sound'),
    victory: document.getElementById('victory-sound'),
    intro: document.getElementById('intro-music')
};