import {  restartGame, selectHero } from './game-logic.js';
import { uiElements , showScreen, updateDisplay} from './ui-manager.js';
import { gameState } from './game_state.js';
import { GAME_STATES , ACTIONS} from './constants.js';
import {rollDice , endCurrentPlayerTurn} from './game-phases.js';
import { prepareAction, executeAttackRoll} from './game-actions.js';


export function initEventListeners() {
    document.querySelectorAll('.player-buttons button').forEach(button => {
        button.addEventListener('click', () => {
            gameState.playerCount = parseInt(button.dataset.players);
            showScreen(GAME_STATES.SELECT_HEROES);
            updateDisplay('currentPlayer', `(Joueur ${gameState.currentPlayerSelecting})`);
        });
    });

    document.querySelectorAll('.hero-buttons button').forEach(button => {
        button.addEventListener('click', () => selectHero(button.dataset.hero));
    });

    uiElements.buttons.rollDice.addEventListener('click', rollDice);
    uiElements.buttons.attackRoll.addEventListener('click', executeAttackRoll);

    uiElements.buttons.move.addEventListener('click', () => prepareAction(ACTIONS.MOVE));
    uiElements.buttons.attack.addEventListener('click', () => prepareAction(ACTIONS.ATTACK));
    uiElements.buttons.special.addEventListener('click', () => prepareAction(ACTIONS.SPECIAL));
    uiElements.buttons.defend.addEventListener('click', () => prepareAction(ACTIONS.DEFEND));
    uiElements.buttons.endTurn.addEventListener('click', endCurrentPlayerTurn);
    uiElements.buttons.restart.addEventListener('click', restartGame);

    document.querySelectorAll('.attack-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            gameState.attackType = this.dataset.type;
            document.querySelectorAll('.attack-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}
