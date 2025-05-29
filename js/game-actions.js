import { gameState } from './game_state.js';
import { arena, combatSystem } from './main-instances.js';
import { getCurrentPlayer } from './game-logic.js';
import { showScreen, logToCombat, resetAttackUI, uiElements, getDiceFace } from './ui-manager.js';
import { ATTACK_TYPES, ACTIONS, GAME_STATES, CELL_TYPES } from './constants.js';
import { lancerDe } from './utils.js';
import{showAttackRollScreen} from './game-ui.js';
export function prepareAction(action) {
    const currentPlayer = getCurrentPlayer();
    const position = arena.findHeroPosition(currentPlayer.player);
    
    gameState.currentAction = action;
    arena.clearHighlights();

    switch(action) {
        case ACTIONS.MOVE:
            handleMoveAction(currentPlayer, position);
            break;
        case ACTIONS.ATTACK:
            handleAttackAction(currentPlayer, position);
            break;
        case ACTIONS.SPECIAL:
            useSpecialPower();
            break;
        case ACTIONS.DEFEND:
            defend();
            break;
    }
}

function handleMoveAction(player, position) {
    arena.highlightMovableCells(player.hero, position.x, position.y);
    logToCombat(`${player.hero.name} prépare son déplacement`);
    setupCellClickHandlers();
}

function handleAttackAction(player, position) {
    if (player.hero.name === "Ninja") {
        handleNinjaAttack(player, position);
    } else {
        arena.highlightAttackableCells(player.hero, position.x, position.y);
        logToCombat(`${player.hero.name} prépare son attaque`);
        setupCellClickHandlers();
    }
}

function handleNinjaAttack(player, position) {
    if (!gameState.hasMovedThisTurn) {
        logToCombat("Ninja doit d'abord se déplacer!");
        return;
    }
    gameState.adjacentEnemies = arena.getAdjacentEnemies(player.player, position.x, position.y);
    gameState.adjacentEnemies.forEach(enemyPos => {
        arena.highlightCell(enemyPos.x, enemyPos.y, 'attackable');
    });
    setupCellClickHandlers();
}

export function handleCellClick(event) {
    const cell = event.currentTarget;
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    const currentPlayer = getCurrentPlayer();

    if (!gameState.currentAction) return;

    if (cell.classList.contains('movable')) {
        if (gameState.currentAction === ACTIONS.MOVE) {
            moveHero(x, y);
        }
    } else if (cell.classList.contains('attackable')) {
        if (gameState.currentAction === ACTIONS.ATTACK) {
            handleAttackTarget(x, y, currentPlayer);
        }
    } else {
        resetActionState();
    }
}

function handleAttackTarget(x, y, currentPlayer) {
    if (currentPlayer.hero.name === "Ninja") {
        handleNinjaAttackTarget(x, y, currentPlayer);
    } else {
        prepareAttack(x, y);
    }
}

function handleNinjaAttackTarget(x, y, currentPlayer) {
    const isAdjacentEnemy = gameState.adjacentEnemies.some(
        enemy => enemy.x === x && enemy.y === y
    );
    isAdjacentEnemy ? prepareAttack(x, y) : logToCombat("Cible invalide!");
}

export function moveHero(x, y) {
    const currentPlayer = getCurrentPlayer();
    const currentPos = arena.findHeroPosition(currentPlayer.player);
    const bonusCollected = arena.moveHero(currentPos.x, currentPos.y, x, y);

    if (bonusCollected) {
        const bonusEffect = arena.applyBonus(currentPlayer.hero);
        logToCombat(`Bonus obtenu: ${bonusEffect}`);
    }

    gameState.hasMovedThisTurn = true;
    resetActionState();
    updateGameStateAfterMove(currentPlayer, x, y);
}

function updateGameStateAfterMove(player, x, y) {
    if (player.hero.name === "Ninja") {
        gameState.adjacentEnemies = arena.getAdjacentEnemies(player.player, x, y);
        uiElements.buttons.attack.disabled = gameState.adjacentEnemies.length === 0;
    }
}

export function prepareAttack(x, y) {
    const currentPlayer = getCurrentPlayer();
    gameState.attackTarget = gameState.turnOrder.find(
        p => p.player !== currentPlayer.player && 
        arena.grid[y][x].hero.playerNumber === p.player
    );
    
    if (gameState.attackTarget) {
        showAttackRollScreen(currentPlayer, gameState.attackTarget);
    } else {
        resetActionState();
    }
}

export function executeAttack(roll) {
    const currentPlayer = getCurrentPlayer();
    const result = combatSystem.performAttack(
        currentPlayer, 
        gameState.attackTarget, 
        gameState.attackType, 
        roll
    );
    
    logToCombat(result.message);
    gameState.hasAttacked = true;
    finishAttack();
}
function showAttackResult(message, type) {
    const resultElement = document.getElementById('attack-result');
    resultElement.textContent = message;
    resultElement.className = 'attack-result ' + type;
}

export function executeAttackRoll() {
    if (!gameState.attackType) {
        showAttackResult("Veuillez choisir un type d'attaque", "error");
        return;
    }

    disablePlayerControls();
    uiElements.displays.attackDice.classList.add('rolling');
    document.getElementById('attack-result').textContent = '';
    document.getElementById('attack-roll-button').disabled = true;

    setTimeout(() => {
        const roll = lancerDe();
        uiElements.displays.attackDice.classList.remove('rolling');
        uiElements.displays.attackDice.textContent = getDiceFace(roll);
        
        let resultText = "";
        if (roll <= 2) {
            resultText = "Échec (1-2)";
            showAttackResult(resultText, "fail");
        } else if (roll <= 5) {
            resultText = "Réussite (3-5)";
            showAttackResult(resultText, "success");
        } else {
            resultText = "Coup critique! (6)";
            showAttackResult(resultText, "critical");
        }

        setTimeout(() => {
            executeAttack(roll);
        }, 1500);
    }, 1500);
}

function useSpecialPower() {
    const currentPlayer = getCurrentPlayer();
    const result = combatSystem.performSpecialPower(currentPlayer);
    logToCombat(result.message);
    
    if (result.success) {
        gameState.hasPerformedAction = true;
        handleSpecialEffects(currentPlayer);
    }
    resetActionState();
}

function handleSpecialEffects(player) {
    if (player.hero.name === "Sorcier") {
        document.getElementById('arena').style.boxShadow = '0 0 20px purple';
        setTimeout(() => {
            document.getElementById('arena').style.boxShadow = '';
        }, 500);
    }
}

function defend() {
    const currentPlayer = getCurrentPlayer();
    currentPlayer.hero.isDefending = true;
    logToCombat(`${currentPlayer.hero.name} se défend`);
    gameState.hasPerformedAction = true;
    resetActionState();
}

function finishAttack() {
    if (gameState.attackTarget.hero.hp <= 0) {
        handleDefeatedPlayer(gameState.attackTarget);
    }
    showScreen(GAME_STATES.PLAYING);
    resetActionState();
}

function handleDefeatedPlayer(player) {
    logToCombat(`${player.hero.name} est éliminé!`);
    gameState.turnOrder = gameState.turnOrder.filter(p => p.player !== player.player);
}

function resetActionState() {
    gameState.currentAction = null;
    gameState.attackTarget = null;
    arena.clearHighlights();
    removeCellClickHandlers();
    resetAttackUI();
}

function setupCellClickHandlers() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });
}

function removeCellClickHandlers() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.removeEventListener('click', handleCellClick);
    });
}
function disablePlayerControls() {
    uiElements.buttons.move.disabled = true;
    uiElements.buttons.attack.disabled = true;
    uiElements.buttons.special.disabled = true;
    uiElements.buttons.defend.disabled = true;
    uiElements.buttons.endTurn.disabled = true;
}