import { Arena } from './arena.js';
import { HEROES } from './heroes.js';
import { lancerDe, updateCooldowns, resetSpecialEffects } from './utils.js';
import { CombatSystem } from './combat.js';
import { ACTIONS, GAME_STATES, ATTACK_TYPES } from './constants.js';
import * as utils from './main.js';
import  {uiElements} from './ui.js';
import {gameState , restartGame} from './game-state.js';



export function initEventListeners() {
    uiElements.buttons.startgame.addEventListener('click', () => {
        utils.showScreen(GAME_STATES.SELECT_PLAYERS);
    });
    document.querySelectorAll('.player-buttons button').forEach(button => {
        button.addEventListener('click', () => {
            gameState.playerCount = parseInt(button.dataset.players);
            utils.showScreen(GAME_STATES.SELECT_HEROES);
            utils.updateDisplay('currentPlayer', `(Joueur ${gameState.currentPlayerSelecting})`);
        });
    });

    document.querySelectorAll('.hero-buttons button').forEach(button => {
        button.addEventListener('click', () => utils.selectHero(button.dataset.hero));
    });

    uiElements.buttons.rollDice.addEventListener('click', utils.rollDice);
    uiElements.buttons.attackRoll.addEventListener('click', utils.executeAttackRoll);

    uiElements.buttons.move.addEventListener('click', () => utils.prepareAction(ACTIONS.MOVE));
    uiElements.buttons.attack.addEventListener('click', () => utils.prepareAction(ACTIONS.ATTACK));
    uiElements.buttons.special.addEventListener('click', () => utils.prepareAction(ACTIONS.SPECIAL));
    uiElements.buttons.defend.addEventListener('click', () => utils.prepareAction(ACTIONS.DEFEND));
    uiElements.buttons.endTurn.addEventListener('click', utils.endCurrentPlayerTurn);
    uiElements.buttons.restart.addEventListener('click', utils.restartGame);

    document.querySelectorAll('.attack-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            gameState.attackType = this.dataset.type;
            document.querySelectorAll('.attack-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}