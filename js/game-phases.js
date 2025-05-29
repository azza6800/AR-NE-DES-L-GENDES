import { gameState } from './game_state.js';
import { arena } from './main-instances.js';
import { showScreen, logToCombat, uiElements, getDiceFace , updateDisplay} from './ui-manager.js';
import { GAME_STATES } from './constants.js';
import { lancerDe } from './utils.js';
import { getCurrentPlayer } from './game-logic.js';



export function startDiceRollPhase() {
    showScreen(GAME_STATES.DICE_ROLL);
    resetDiceUI();
    gameState.diceRolls = [];
    gameState.currentRollingPlayer = 0;
    processPlayerRoll();
}

function resetDiceUI() {
    uiElements.displays.rollResults.innerHTML = '';
    uiElements.displays.dice.textContent = '⚀';
}

export function processPlayerRoll() {
    if (gameState.currentRollingPlayer >= gameState.selectedHeroes.length) {
        determineTurnOrder();
        return;
    }
    
    const player = gameState.selectedHeroes[gameState.currentRollingPlayer];
    updateDisplay('rollingPlayer', player.player);
    uiElements.buttons.rollDice.disabled = false;
    uiElements.displays.dice.classList.remove('rolling');
}


export function rollDice() {
    uiElements.buttons.rollDice.disabled = true;
    uiElements.displays.dice.classList.add('rolling');
    
    setTimeout(() => {
        const player = gameState.selectedHeroes[gameState.currentRollingPlayer];
        const rollValue = lancerDe();
        
        uiElements.displays.dice.textContent = getDiceFace(rollValue);
        gameState.diceRolls.push({
            player: player.player,
            hero: player.hero,
            roll: rollValue
        });
        
        addRollResultToUI(player, rollValue);
        gameState.currentRollingPlayer++;
        processPlayerRoll();
    }, 1500);
}

function addRollResultToUI(player, rollValue) {
    const resultEntry = document.createElement('div');
    resultEntry.className = 'result-entry';
    resultEntry.textContent = `Joueur ${player.player} (${player.hero.name}) : ${rollValue}`;
    uiElements.displays.rollResults.appendChild(resultEntry);
}

export function determineTurnOrder() {
    console.log('Avant tri:', gameState.diceRolls);
    gameState.turnOrder = [...gameState.diceRolls].sort((a, b) => b.roll - a.roll);
    console.log('Ordre des joueurs:', gameState.turnOrder);
    placeHeroesOnArena();
    arena.render()
    startGame();
}

export function placeHeroesOnArena() {
    const positions = arena.getStartingPositions(gameState.playerCount);
    console.log('Positions:', positions);
    
    gameState.turnOrder.forEach((player, index) => {
        const [x, y] = positions[index];
        console.log(`Placer ${player.hero} en [${x},${y}]`);
        arena.grid[y][x] = {
            type: 'hero',
            hero: player.hero
        };
    });
}


function startGame() {
    showScreen(GAME_STATES.PLAYING);
    gameState.currentTurn = 1;
    gameState.currentPlayerIndex = 0;
    beginTurn();
}

export function beginTurn() {
    const currentPlayer = getCurrentPlayer();
    resetTurnFlags();
    updateTurnDisplay(currentPlayer);
    
    if (currentPlayer.hero.hp <= 0) {
        handleKOTurn(currentPlayer);
        return;
    }
    
    if (currentPlayer.hero.name === "Ninja") {
        currentPlayer.hasDoubleAttack = true;
    }
}

function resetTurnFlags() {
    gameState.hasPerformedAction = false;
    gameState.hasMovedThisTurn = false;
    gameState.hasAttacked = false;
}

function updateTurnDisplay(player) {
    updateDisplay('turnInfo', `Tour ${gameState.currentTurn} - Joueur ${player.player}`);
    logToCombat(`--- Tour ${gameState.currentTurn} ---`);
    logToCombat(`Joueur ${player.player} commence son tour`);
}

function handleKOTurn(player) {
    logToCombat(`${player.hero.name} est KO!`);
    endCurrentPlayerTurn();
}

export function endCurrentPlayerTurn() {
    const currentPlayer = getCurrentPlayer();
    logToCombat(`Joueur ${currentPlayer.player} termine son tour`);
    
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.turnOrder.length;
    
    if (gameState.currentPlayerIndex === 0) {
        gameState.currentTurn++;
    }
    
    setTimeout(beginTurn, 500);
}