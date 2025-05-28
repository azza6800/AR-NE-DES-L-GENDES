import { gameState, resetGameState } from './game_state.js';
import { HEROES } from './heroes.js';
import { lancerDe, updateCooldowns } from './utils.js';
import { Arena } from './arena.js';
import { CombatSystem } from './combat.js';
import { GAME_STATES, ACTIONS, ATTACK_TYPES } from './constants.js';
import { 
    uiElements, 
    showScreen, 
    updateDisplay, 
    logToCombat, 
    getDiceFace,
    resetAttackUI
} from './ui-manager.js';

let arena;
let combatSystem;

export function initGame() {
    arena = new Arena();
    combatSystem = new CombatSystem(arena, gameState);
    initEventListeners();
    showScreen(GAME_STATES.SELECT_PLAYERS);
}

function initEventListeners() {
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

export function selectHero(heroKey) {
    const hero = { ...HEROES[heroKey], playerNumber: gameState.currentPlayerSelecting };
    
    gameState.selectedHeroes.push({
        player: gameState.currentPlayerSelecting,
        hero: hero
    });

    if (gameState.currentPlayerSelecting < gameState.playerCount) {
        gameState.currentPlayerSelecting++;
        updateDisplay('currentPlayer', `(Joueur ${gameState.currentPlayerSelecting})`);
    } else {
        startDiceRollPhase();
    }
}

function startDiceRollPhase() {
    showScreen(GAME_STATES.DICE_ROLL);
    uiElements.displays.rollResults.innerHTML = '';
    gameState.diceRolls = [];
    gameState.currentRollingPlayer = 0;
    processPlayerRoll();
}

function processPlayerRoll() {
    if (gameState.currentRollingPlayer >= gameState.selectedHeroes.length) {
        determineTurnOrder();
        return;
    }
    
    const player = gameState.selectedHeroes[gameState.currentRollingPlayer];
    updateDisplay('rollingPlayer', player.player);
    uiElements.buttons.rollDice.disabled = false;
    uiElements.displays.dice.textContent = '⚀';
    uiElements.displays.dice.classList.remove('rolling');
}

function rollDice() {
    uiElements.buttons.rollDice.disabled = true;
    uiElements.displays.dice.classList.add('rolling');
    
    setTimeout(() => {
        const player = gameState.selectedHeroes[gameState.currentRollingPlayer];
        const rollValue = lancerDe();
        
        uiElements.displays.dice.classList.remove('rolling');
        uiElements.displays.dice.textContent = getDiceFace(rollValue);
        
        gameState.diceRolls.push({
            player: player.player,
            hero: player.hero,
            roll: rollValue
        });
        
        const resultEntry = document.createElement('div');
        resultEntry.className = 'result-entry';
        resultEntry.textContent = `Joueur ${player.player} (${player.hero.name}) : ${rollValue}`;
        uiElements.displays.rollResults.appendChild(resultEntry);
        
        gameState.currentRollingPlayer++;
        processPlayerRoll();
    }, 1500);
}

function determineTurnOrder() {
    gameState.turnOrder = [...gameState.diceRolls].sort((a, b) => b.roll - a.roll);
    placeHeroesOnArena();
    startGame();
}

function placeHeroesOnArena() {
    const positions = arena.getStartingPositions(gameState.playerCount);
    
    gameState.turnOrder.forEach((player, index) => {
        const [x, y] = positions[index];
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
    gameState.combatLog = [];
    updateGameUI();
    beginTurn();
}

function beginTurn() {
    const currentPlayer = getCurrentPlayer();
    
    gameState.hasPerformedAction = false;
    gameState.hasMovedThisTurn = false;
    gameState.hasAttacked = false;
    gameState.currentPhase = 'ACTION';
    gameState.adjacentEnemies = null;
    
    if (currentPlayer.hero.name === "Ninja") {
        currentPlayer.hasDoubleAttack = true;
    }
    
    updateDisplay('turnInfo', `Tour ${gameState.currentTurn} - Joueur ${currentPlayer.player} (${currentPlayer.hero.name})`);
    logToCombat(`--- Tour ${gameState.currentTurn} ---`);
    logToCombat(`Joueur ${currentPlayer.player} (${currentPlayer.hero.name}) commence son tour`);
    
    if (currentPlayer.hero.hp <= 0) {
        logToCombat(`${currentPlayer.hero.name} est KO et passe son tour!`);
        endCurrentPlayerTurn();
        return;
    }
    
    enablePlayerControls();
}

export function getCurrentPlayer() {
    return gameState.turnOrder[gameState.currentPlayerIndex];
}

function enablePlayerControls() {
    const currentPlayer = getCurrentPlayer();
    const isNinja = currentPlayer.hero.name === "Ninja";
    const position = arena.findHeroPosition(currentPlayer.player);
    
    uiElements.buttons.move.disabled = gameState.hasMovedThisTurn;
    
    if (isNinja) {
        gameState.adjacentEnemies = arena.getAdjacentEnemies(currentPlayer.player, position.x, position.y);
        
        uiElements.buttons.attack.disabled = 
            gameState.hasAttacked || 
            !gameState.hasMovedThisTurn || 
            !gameState.adjacentEnemies || 
            gameState.adjacentEnemies.length === 0;
    } else {
        uiElements.buttons.attack.disabled = 
            gameState.hasAttacked || 
            gameState.hasMovedThisTurn;
    }
    
    uiElements.buttons.special.disabled = 
        currentPlayer.hero.specialPower.currentCooldown > 0 || 
        gameState.hasMovedThisTurn;
    
    uiElements.buttons.defend.disabled = gameState.hasMovedThisTurn;
    uiElements.buttons.endTurn.disabled = false;
}

function disablePlayerControls() {
    uiElements.buttons.move.disabled = true;
    uiElements.buttons.attack.disabled = true;
    uiElements.buttons.special.disabled = true;
    uiElements.buttons.defend.disabled = true;
    uiElements.buttons.endTurn.disabled = true;
}

export function prepareAction(action) {
    const currentPlayer = getCurrentPlayer();
    const isNinja = currentPlayer.hero.name === "Ninja";
    
    gameState.currentAction = action;
    const position = arena.findHeroPosition(currentPlayer.player);
    
    arena.clearHighlights();
    
    switch(action) {
        case ACTIONS.MOVE:
            arena.highlightMovableCells(currentPlayer.hero, position.x, position.y);
            logToCombat(`${currentPlayer.hero.name} se prépare à se déplacer (${currentPlayer.hero.speed} cases max)`);
            break;
        case ACTIONS.ATTACK:
            if (isNinja) {
                if (gameState.hasMovedThisTurn) {
                    gameState.adjacentEnemies = arena.getAdjacentEnemies(currentPlayer.player, position.x, position.y);
                    if (gameState.adjacentEnemies.length > 0) {
                        gameState.adjacentEnemies.forEach(enemyPos => {
                            arena.highlightCell(enemyPos.x, enemyPos.y, 'attackable');
                        });
                        logToCombat("Ninja: Sélectionnez un ennemi adjacent à attaquer");
                    } else {
                        logToCombat("Ninja: Aucun ennemi adjacent à attaquer!");
                        return;
                    }
                } else {
                    logToCombat("Ninja doit d'abord se déplacer avant de pouvoir attaquer!");
                    return;
                }
            } else {
                arena.highlightAttackableCells(currentPlayer.hero, position.x, position.y);
                logToCombat(`${currentPlayer.hero.name} se prépare à attaquer (portée: ${currentPlayer.hero.range})`);
            }
            break;
        case ACTIONS.SPECIAL:
            useSpecialPower();
            break;
        case ACTIONS.DEFEND:
            defend();
            break;
    }
    
    if (action !== ACTIONS.SPECIAL && action !== ACTIONS.DEFEND) {
        setupCellClickHandlers();
    }
}

function setupCellClickHandlers() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });
}

function handleCellClick(event) {
    const cell = event.currentTarget;
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    const currentPlayer = getCurrentPlayer();
    const isNinja = currentPlayer.hero.name === "Ninja";
    
    if (!gameState.currentAction) return;

    if (cell.classList.contains('movable')) {
        if (gameState.currentAction === ACTIONS.MOVE && !gameState.hasMovedThisTurn) {
            moveHero(x, y);
        }
    } else if (cell.classList.contains('attackable')) {
        if (gameState.currentAction === ACTIONS.ATTACK) {
            if (isNinja) {
                const isAdjacentEnemy = gameState.adjacentEnemies.some(
                    enemy => enemy.x === x && enemy.y === y
                );
                
                if (isAdjacentEnemy) {
                    prepareAttack(x, y);
                } else {
                    logToCombat("Ninja ne peut attaquer que les ennemis adjacents!");
                }
            } else {
                prepareAttack(x, y);
            }
        }
    } else {
        resetActionState();
        logToCombat("Action annulée");
    }
}

function moveHero(x, y) {
    const currentPlayer = getCurrentPlayer();
    const isNinja = currentPlayer.hero.name === "Ninja";
    
    if (gameState.hasMovedThisTurn) {
        logToCombat("Vous avez déjà bougé ce tour!");
        return;
    }

    const currentPos = arena.findHeroPosition(currentPlayer.player);
    const bonusCollected = arena.moveHero(currentPos.x, currentPos.y, x, y);

    if (bonusCollected) {
        const bonusEffect = arena.applyBonus(currentPlayer.hero);
        logToCombat(`${currentPlayer.hero.name} a ramassé un bonus! ${bonusEffect}`);
    }

    logToCombat(`${currentPlayer.hero.name} se déplace vers (${x},${y})`);
    gameState.hasMovedThisTurn = true;
    gameState.hasPerformedAction = true;
    resetActionState();

    if (isNinja) {
        gameState.adjacentEnemies = arena.getAdjacentEnemies(currentPlayer.player, x, y);
        
        if (gameState.adjacentEnemies.length > 0) {
            logToCombat("Ninja: Des ennemis sont adjacents! Vous pouvez attaquer.");
            uiElements.buttons.attack.disabled = false;
        } else {
            logToCombat("Ninja: Aucun ennemi adjacent. Vous pouvez terminer votre tour.");
        }
    } else {
        setTimeout(() => endCurrentPlayerTurn(), 1000);
    }
    
    updateGameUI();
}

function prepareAttack(x, y) {
    const currentPlayer = getCurrentPlayer();
    gameState.attackTarget = gameState.turnOrder.find(
        p => p.player !== currentPlayer.player && 
        arena.grid[y][x].hero.playerNumber === p.player
    );
    
    if (gameState.attackTarget) {
        showAttackRollScreen(currentPlayer, gameState.attackTarget);
        
        document.querySelector('.attacker .hero-icon').style.backgroundImage = 
            `url(assets/images/${currentPlayer.hero.name.toLowerCase()}.gif)`;
        document.querySelector('.defender .hero-icon').style.backgroundImage = 
            `url(assets/images/${gameState.attackTarget.hero.name.toLowerCase()}.gif)`;
    } else {
        resetActionState();
    }
}

function showAttackRollScreen(attacker, defender) {
    uiElements.displays.attackRollAttacker.textContent = `Attaquant: Joueur ${attacker.player} (${attacker.hero.name})`;
    uiElements.displays.attackRollDefender.textContent = `Défenseur: Joueur ${defender.player} (${defender.hero.name})`;
    uiElements.displays.attackDice.textContent = '⚀';
    showScreen('ATTACK_ROLL');
}

function executeAttackRoll() {
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

function showAttackResult(message, type) {
    const resultElement = document.getElementById('attack-result');
    resultElement.textContent = message;
    resultElement.className = 'attack-result ' + type;
}

function executeAttack(roll) {
    const currentPlayer = getCurrentPlayer();
    let result;
    
    if (currentPlayer.hero.name === "Ninja" && currentPlayer.hasDoubleAttack) {
        result = combatSystem.performAttack(currentPlayer, gameState.attackTarget, ATTACK_TYPES.QUICK, roll);
        logToCombat(result.message);
        
        if (gameState.attackTarget.hero.hp > 0) {
            setTimeout(() => {
                const secondRoll = lancerDe();
                showAttackRoll(secondRoll, () => {
                    result = combatSystem.performAttack(currentPlayer, gameState.attackTarget, ATTACK_TYPES.QUICK, secondRoll);
                    logToCombat(`Seconde attaque: ${result.message}`);
                    currentPlayer.hasDoubleAttack = false;
                    finishAttack();
                });
            }, 1000);
        } else {
            currentPlayer.hasDoubleAttack = false;
            finishAttack();
        }
    } else {
        result = combatSystem.performAttack(currentPlayer, gameState.attackTarget, gameState.attackType, roll);
        logToCombat(result.message);
        finishAttack();
    }
    
    gameState.hasAttacked = true;
}

function showAttackRoll(rollValue, callback) {
    uiElements.displays.attackDice.textContent = getDiceFace(rollValue);
    uiElements.displays.attackDice.classList.add('rolling');
    
    setTimeout(() => {
        uiElements.displays.attackDice.classList.remove('rolling');
        if (callback) callback();
    }, 1000);
}

function finishAttack() {
    updateGameUI();
    
    if (gameState.attackTarget.hero.hp <= 0) {
        handleDefeatedPlayer(gameState.attackTarget);
    }
    
    resetActionState();
    showScreen(GAME_STATES.PLAYING);
    
    setTimeout(() => {
        endCurrentPlayerTurn();
    }, 1000);
}

function handleDefeatedPlayer(defeatedPlayer) {
    logToCombat(`${defeatedPlayer.hero.name} a été vaincu!`);
    
    gameState.turnOrder = gameState.turnOrder.filter(p => p.player !== defeatedPlayer.player);
    
    if (gameState.turnOrder.length === 1) {
        endGame();
        return;
    }
    
    if (gameState.currentPlayerIndex >= gameState.turnOrder.length) {
        gameState.currentPlayerIndex = 0;
    }
}

function useSpecialPower() {
    const currentPlayer = getCurrentPlayer();
    const result = combatSystem.performSpecialPower(currentPlayer);
    logToCombat(result.message);
    
    if (result.success) {
        gameState.hasPerformedAction = true;
        
        if (currentPlayer.hero.name === "Sorcier") {
            document.getElementById('arena').style.boxShadow = '0 0 20px purple';
            setTimeout(() => {
                document.getElementById('arena').style.boxShadow = '';
            }, 500);
        }
        
        setTimeout(() => {
            endCurrentPlayerTurn();
        }, 1000);
    }
    
    resetActionState();
}

function defend() {
    const currentPlayer = getCurrentPlayer();
    currentPlayer.hero.isDefending = true;
    logToCombat(`${currentPlayer.hero.name} se met en position défensive (dégâts réduits de 50% au prochain tour)`);
    gameState.hasPerformedAction = true;
    resetActionState();
    
    setTimeout(() => {
        endCurrentPlayerTurn();
    }, 1000);
}

function resetActionState() {
    gameState.currentAction = null;
    gameState.attackTarget = null;
    gameState.attackType = null;
    gameState.adjacentEnemies = null;
    arena.clearHighlights();
    removeCellClickHandlers();
    resetAttackUI();
}

function removeCellClickHandlers() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.removeEventListener('click', handleCellClick);
    });
}

function endCurrentPlayerTurn() {
    const currentPlayer = getCurrentPlayer();
    logToCombat(`Joueur ${currentPlayer.player} (${currentPlayer.hero.name}) termine son tour`);
    
    updateCooldowns(gameState);
    
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.turnOrder.length;
    
    if (gameState.currentPlayerIndex === 0) {
        gameState.currentTurn++;
    }
    
    setTimeout(() => {
        beginTurn();
    }, 500);
}

export function updateGameUI() {
    arena.render();
    updatePlayerInfo();
    enablePlayerControls();
    
    document.querySelectorAll('.health-bar').forEach(bar => {
        const playerNumber = bar.dataset.player;
        const player = gameState.turnOrder.find(p => p.player == playerNumber);
        if (player) {
            const hpPercentage = (player.hero.hp / player.hero.maxHp) * 100;
            bar.style.width = `${hpPercentage}%`;
            bar.textContent = `${player.hero.hp}/${player.hero.maxHp}`;
            bar.className = `health-bar ${hpPercentage < 30 ? 'danger' : ''}`;
        }
    });
}

function updatePlayerInfo() {
    const playerInfoContainer = document.getElementById('player-info');
    if (!playerInfoContainer) return;
    
    playerInfoContainer.innerHTML = '';
    
    gameState.turnOrder.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-info';
        
        const hpPercentage = (player.hero.hp / player.hero.maxHp) * 100;
        
        playerElement.innerHTML = `
            <h3>Joueur ${player.player}: ${player.hero.name}</h3>
            <div class="health-container">
                <div class="health-bar ${hpPercentage < 30 ? 'danger' : ''}" 
                     style="width: ${hpPercentage}%"
                     data-player="${player.player}">
                    ${player.hero.hp}/${player.hero.maxHp}
                </div>
            </div>
            <p>Attaque: ${player.hero.power}</p>
            <p>Défense: ${player.hero.defense}</p>
            <p>Pouvoir spécial: ${player.hero.specialPower.name}</p>
            ${player.hero.specialPower.currentCooldown > 0 ? 
              `<p>Recharge: ${player.hero.specialPower.currentCooldown} tours</p>` : ''}
        `;
        
        playerInfoContainer.appendChild(playerElement);
    });
}

function endGame() {
    const winner = gameState.turnOrder[0];
    showVictoryScreen(winner);
}

function showVictoryScreen(winner) {
    showScreen(GAME_STATES.GAME_OVER);
    updateDisplay('victoryMessage', `Joueur ${winner.player} (${winner.hero.name}) a gagné !`);
    logToCombat(`Fin du jeu - Joueur ${winner.player} (${winner.hero.name}) a gagné !`);
}

export function restartGame() {
    resetGameState();
    arena = new Arena();
    showScreen(GAME_STATES.SELECT_PLAYERS);
}