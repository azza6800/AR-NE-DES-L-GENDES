import { gameState } from './game_state.js';
import { GAME_STATES } from './constants.js';

export const uiElements = {
    screens: {
        playerSelection: document.getElementById('player-selection'),
        heroSelection: document.getElementById('hero-selection'),
        diceRollScreen: document.getElementById('dice-roll-screen'),
        gameArena: document.getElementById('game-arena'),
        victoryScreen: document.getElementById('victory-screen'),
        attackRollScreen: document.getElementById('attack-roll-screen')
    },
    buttons: {
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

export function showScreen(screen) {
    gameState.currentState = screen;
    
    for (const [key, element] of Object.entries(uiElements.screens)) {
        element.style.display = 'none';
    }
    
    switch(screen) {
        case GAME_STATES.SELECT_PLAYERS:
            uiElements.screens.playerSelection.style.display = 'block';
            break;
        case GAME_STATES.SELECT_HEROES:
            uiElements.screens.heroSelection.style.display = 'block';
            break;
        case GAME_STATES.DICE_ROLL:
            uiElements.screens.diceRollScreen.style.display = 'block';
            break;
        case GAME_STATES.PLAYING:
            uiElements.screens.gameArena.style.display = 'block';
            resetAttackUI();
            break;
        case GAME_STATES.GAME_OVER:
            uiElements.screens.victoryScreen.style.display = 'block';
            break;
        case 'ATTACK_ROLL':
            uiElements.screens.attackRollScreen.style.display = 'flex';
            break;
    }
}

export function updateDisplay(element, text) {
    if (uiElements.displays[element]) {
        uiElements.displays[element].textContent = text;
    }
}

export function logToCombat(message) {
    const entry = document.createElement('div');
    entry.textContent = message;
    uiElements.displays.combatLog.appendChild(entry);
    uiElements.displays.combatLog.scrollTop = uiElements.displays.combatLog.scrollHeight;
}

export function resetAttackUI() {
    uiElements.displays.attackDice.textContent = '⚀';
    document.getElementById('attack-result').textContent = '';
    document.getElementById('attack-result').className = 'attack-result';
    document.getElementById('attack-roll-button').disabled = false;
    document.querySelectorAll('.attack-type-btn').forEach(b => b.classList.remove('active'));
}

export function getDiceFace(value) {
    const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return faces[value - 1] || '⚀';
}