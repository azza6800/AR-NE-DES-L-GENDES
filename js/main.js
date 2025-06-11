import { Arena } from './arena.js';
import { HEROES } from './heroes.js';
import { lancerDe, updateCooldowns, resetSpecialEffects } from './utils.js';
import { CombatSystem } from './combat.js';
import { ACTIONS, GAME_STATES, ATTACK_TYPES } from './constants.js';
import { initEventListeners } from './event-listeners.js';
import {uiElements, soundEffects} from './ui.js';
import {gameState , restartGame} from './game-state.js';

export let arena;
export let combatSystem;

document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

export function initGame() {
    arena = new Arena();
    combatSystem = new CombatSystem(arena, gameState);
    initEventListeners();

    // Renforcement de la lecture audio
    const audio = soundEffects.intro;
    audio.volume = 0.5;
    audio.load(); // Force le préchargement

    audio.play().then(() => {
        console.log("Lecture automatique réussie.");
    }).catch(err => {
        console.warn("Lecture automatique bloquée :", err);

        // Plan B : attendre la première interaction utilisateur
        const resumeAudio = () => {
            audio.play().then(() => {
                console.log("Lecture relancée après interaction.");
            }).catch(e => {
                console.error("Impossible de lancer l'audio même après interaction :", e);
            });
            document.removeEventListener('click', resumeAudio);
        };

        document.addEventListener('click', resumeAudio);
    });

    showScreen(GAME_STATES.INTRO);
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
        uiElements.displays.dice.classList.remove('rolling');
        setTimeout(() => {
            determineTurnOrder();
        }, 1500);

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
    }, 2000);
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
    // Arrêter la musique d'intro
    soundEffects.intro.pause();
    soundEffects.intro.currentTime = 0;
    
    showScreen(GAME_STATES.PLAYING);
    gameState.currentTurn = 1;
    gameState.currentPlayerIndex = 0;
    gameState.combatLog = [];
    updateGameUI();
     // Renforcement de la lecture audio
    const audio = soundEffects.intro;
    audio.volume = 0.5;
    audio.load(); // Force le préchargement

    audio.play().then(() => {
        console.log("Lecture automatique réussie.");
    }).catch(err => {
        console.warn("Lecture automatique bloquée :", err);

        // Plan B : attendre la première interaction utilisateur
        const resumeAudio = () => {
            audio.play().then(() => {
                console.log("Lecture relancée après interaction.");
            }).catch(e => {
                console.error("Impossible de lancer l'audio même après interaction :", e);
            });
            document.removeEventListener('click', resumeAudio);
        };

        document.addEventListener('click', resumeAudio);
    });
    beginTurn();
}

function beginTurn() {
    resetSpecialEffects(gameState);
    const currentPlayer = getCurrentPlayer();
    
    gameState.hasPerformedAction = false;
    gameState.hasMovedThisTurn = false;
    gameState.hasAttacked = false;
    gameState.currentPhase = 'ACTION';
    gameState.adjacentEnemies = null;
    
    // Ne pas réinitialiser hasDoubleAttack ici, seulement dans useSpecialPower()
    
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

function getCurrentPlayer() {
    console.log("gameState.turnOrder : ",gameState.turnOrder ,"index", gameState.currentPlayerIndex);
    return gameState.turnOrder[gameState.currentPlayerIndex];
}

function enablePlayerControls() {
    const currentPlayer = getCurrentPlayer();
    
    // ✅ Sécurité : ne rien faire si le joueur est éliminé
    if (!currentPlayer || !currentPlayer.hero || currentPlayer.hero.hp <= 0) {
        console.warn("Aucun joueur actif ou joueur éliminé — contrôle désactivé.");
        return;
    }
    const isNinja = currentPlayer.hero.name === "Ninja";
    const isSorcerer = currentPlayer.hero.name === "Sorcier";
    const position = arena.findHeroPosition(currentPlayer.player);

    // Calcul des ennemis adjacents
    gameState.adjacentEnemies = arena.getAdjacentEnemies(currentPlayer.player, position.x, position.y);

    // Boutons de base activés/désactivés
    uiElements.buttons.endTurn.disabled = false;
    uiElements.buttons.special.disabled = 
        currentPlayer.hero.specialPower.currentCooldown > 0 || 
        gameState.hasUsedSpecial;

    if (isNinja) {
        // Ninja peut toujours bouger
        uiElements.buttons.move.disabled = false;

        // Attaque possible seulement s'il n'a pas encore attaqué et ennemis adjacents
        uiElements.buttons.attack.disabled = 
            gameState.hasAttacked || 
            !gameState.adjacentEnemies || 
            gameState.adjacentEnemies.length === 0;

        // Défense possible si pas encore défendu ni utilisé spécial, et vivant
        uiElements.buttons.defend.disabled = 
            gameState.hasDefended || 
            gameState.hasUsedSpecial ||
            (currentPlayer.hero.hp <= 0);

        // Fin de tour automatique après action
        if ((gameState.hasAttacked && !gameState.hasUsedSpecial) || 
            gameState.hasDefended || 
            gameState.hasUsedSpecial) {
            setTimeout(() => {
                endTurn();
            }, 2000);
        }
    } else {
        // Autres héros (y compris Sorcier)

        const hasTakenAction = 
            gameState.hasMovedThisTurn || 
            gameState.hasAttacked || 
            gameState.hasDefended || 
            gameState.hasUsedSpecial;

        uiElements.buttons.move.disabled = hasTakenAction;

        // Pour le sorcier, on autorise l'attaque si ennemis adjacents OU hasRangeAttack actif
        const canAttack =
            !hasTakenAction &&
            (
                (gameState.adjacentEnemies && gameState.adjacentEnemies.length > 0) ||
                (isSorcerer && currentPlayer.hero.hasRangeAttack)
            );

        uiElements.buttons.attack.disabled = !canAttack;

        uiElements.buttons.defend.disabled = 
            hasTakenAction || 
            (currentPlayer.hero.hp <= 0);

        if (hasTakenAction) {
            setTimeout(() => {
                endTurn();
            }, 1000);
        }
    }
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
    const isSorcier = currentPlayer.hero.name === "Sorcier";
    
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
                gameState.adjacentEnemies = arena.getAdjacentEnemies(currentPlayer.player, position.x, position.y);
                
                if (gameState.adjacentEnemies.length > 0) {
                    gameState.adjacentEnemies.forEach(enemyPos => {
                        arena.highlightCell(enemyPos.x, enemyPos.y, 'attackable');
                    });
                    logToCombat("Ninja: Sélectionnez un ennemi adjacent à attaquer");
                } else {
                    logToCombat("Ninja: Aucun ennemi adjacent à attaquer!");
                    resetActionState();
                    endCurrentPlayerTurn();
                    return;
                }

            } else if (isSorcier) {
                const adjacentEnemies = arena.getAdjacentEnemies(currentPlayer.player, position.x, position.y);
                const rangedCells = currentPlayer.hero.hasRangeAttack
                    ? arena.getSorcierAttackableCells(currentPlayer.player, position.x, position.y)
                    : [];

                if (adjacentEnemies.length > 0 || rangedCells.length > 0) {
                    // Afficher les cibles adjacentes
                    adjacentEnemies.forEach(enemyPos => {
                        arena.highlightCell(enemyPos.x, enemyPos.y, 'attackable');
                    });

                    // Afficher les cibles à distance si le pouvoir est actif
                    if (currentPlayer.hero.hasRangeAttack) {
                        rangedCells.forEach(cell => {
                            arena.highlightCell(cell.x, cell.y, 'attackable');
                        });
                    }

                    logToCombat("Sorcier: Sélectionnez un ennemi adjacent ou à distance (2-3 cases)");
                } else {
                    logToCombat("Sorcier: Aucun ennemi à portée!");
                    resetActionState();
                    endCurrentPlayerTurn();
                    return;
                }

            } else {
                // Pour le Chevalier
                const adjacentEnemies = arena.getAdjacentEnemies(currentPlayer.player, position.x, position.y);
                if (adjacentEnemies.length > 0) {
                    adjacentEnemies.forEach(enemyPos => {
                        arena.highlightCell(enemyPos.x, enemyPos.y, 'attackable');
                    });
                    logToCombat("Sélectionnez un ennemi adjacent à attaquer");
                } else {
                    logToCombat("Aucun ennemi adjacent à attaquer!");
                    resetActionState();
                    endCurrentPlayerTurn();
                    return;
                }
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
                ) && arena.grid[y][x]?.type === 'hero' && 
                arena.grid[y][x].hero.playerNumber !== currentPlayer.player;
                
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
    resetActionState();

    if (isNinja) {
        // Le Ninja peut encore attaquer s'il a des ennemis adjacents
        gameState.adjacentEnemies = arena.getAdjacentEnemies(currentPlayer.player, x, y);

        if (gameState.adjacentEnemies.length > 0) {
            logToCombat("Ninja: Des ennemis sont adjacents! Vous pouvez attaquer.");
            enablePlayerControls(); // il peut attaquer
        } else {
            logToCombat("Ninja: Aucun ennemi adjacent. Tour terminé.");
            setTimeout(() => endCurrentPlayerTurn(), 1000);
        }
    } else {
        // Chevalier et Sorcier : déplacement = fin de tour immédiate
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
function executeAttack(roll) {
    const currentPlayer = getCurrentPlayer();
    let result;

    if (currentPlayer.hero.name === "Ninja" && currentPlayer.hasDoubleAttack) {
        // Première attaque
        result = combatSystem.performAttack(currentPlayer, gameState.attackTarget, gameState.attackType, roll);
        logToCombat(`Première attaque: ${result.message}`);

        // Seconde attaque automatique après un court délai
        setTimeout(() => {
            if (gameState.attackTarget.hero.hp > 0) {
                const secondRoll = lancerDe();
                showAttackRoll(secondRoll, () => {
                    result = combatSystem.performAttack(currentPlayer, gameState.attackTarget, gameState.attackType, secondRoll);
                    logToCombat(`Seconde attaque: ${result.message}`);
                    currentPlayer.hasDoubleAttack = false; // Désactive après utilisation
                    gameState.hasAttacked = true;
                    finishAttack();
                });
            } else {
                currentPlayer.hasDoubleAttack = false;
                gameState.hasAttacked = true;
                finishAttack();
            }
        }, 1500);

    } else if (currentPlayer.hero.name === "Sorcier" && currentPlayer.hero.hasRangeAttack) {
        // Attaque spéciale à distance pour le Sorcier
        const attackerPos = arena.findHeroPosition(currentPlayer.player);
        const targetPos = arena.findHeroPosition(gameState.attackTarget.player);
        const dx = Math.abs(attackerPos.x - targetPos.x);
        const dy = Math.abs(attackerPos.y - targetPos.y);
        const distance = dx + dy;

        if (distance >= 2 && distance <= 3) {
            result = combatSystem.performAttack(currentPlayer, gameState.attackTarget, gameState.attackType, roll);
            logToCombat(`Attaque magique à distance : ${result.message}`);
        } else {
            logToCombat(`Cible trop proche ou trop éloignée pour l'attaque magique du Sorcier (distance: ${distance}).`);
        }

        currentPlayer.hero.hasRangeAttack = false; // Désactiver après usage
        gameState.hasAttacked = true;
        finishAttack();

    } else {
        // Attaque normale
        result = combatSystem.performAttack(currentPlayer, gameState.attackTarget, gameState.attackType, roll);
        logToCombat(result.message);
        gameState.hasAttacked = true;
        finishAttack();
    }
}

function showAttackRoll(rollValue, callback) {
    uiElements.displays.attackDice.textContent = getDiceFace(rollValue);
    uiElements.displays.attackDice.classList.add('rolling');
    
    setTimeout(() => {
        uiElements.displays.attackDice.classList.remove('rolling');
        if (callback) callback();
    }, 2000);
}

function showAttackResult(message, type) {
    const resultElement = document.getElementById('attack-result');
    resultElement.textContent = message;
    resultElement.className = 'attack-result ' + type;
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
    
    // Afficher la modale d'élimination
    showEliminationModal(defeatedPlayer);
    
    if (gameState.currentPlayerIndex >= gameState.turnOrder.length) {
        gameState.currentPlayerIndex = 0;
    }
}


function useSpecialPower() {
    const currentPlayer = getCurrentPlayer();
    
    if (currentPlayer.hero.specialPower.currentCooldown > 0) {
        logToCombat(`${currentPlayer.hero.name}: Pouvoir spécial en recharge (${currentPlayer.hero.specialPower.currentCooldown} tours restants)`);
        return;
    }
let message = "";

if (currentPlayer.hero.name === "Ninja") {
    currentPlayer.hasDoubleAttack = true;
    message = `${currentPlayer.hero.name} active ${currentPlayer.hero.specialPower.name}! Il pourra attaquer deux fois ce tour.`;
    currentPlayer.hero.specialPower.currentCooldown = currentPlayer.hero.specialPower.cooldown;
} else if (currentPlayer.hero.name === "Sorcier") {
    const position = arena.findHeroPosition(currentPlayer.player);
    let targetFound = false;

    const directions = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];

    for (const dir of directions) {
        for (let dist = 2; dist <= 3; dist++) {
            const nx = position.x + dir.dx * dist;
            const ny = position.y + dir.dy * dist;

            if (arena.isValidCell(nx, ny)) {
                const cell = arena.grid[ny][nx];
                if (cell?.type === 'hero' && cell.hero.playerNumber !== currentPlayer.player) {
                    targetFound = true;
                    break;
                }
            }
        }
        if (targetFound) break;
    }

    if (targetFound) {
        currentPlayer.hero.hasRangeAttack = true;
        message = `${currentPlayer.hero.name} active ${currentPlayer.hero.specialPower.name}! Il peut attaquer un ennemi à distance (2 à 3 cases).`;
        currentPlayer.hero.specialPower.currentCooldown = currentPlayer.hero.specialPower.cooldown;
        enablePlayerControls();
    } else {
        message = `${currentPlayer.hero.name} invoque son pouvoir... mais aucun ennemi n'est à portée magique.`;
        currentPlayer.hero.specialPower.currentCooldown = currentPlayer.hero.specialPower.cooldown;
        logToCombat(message);
        gameState.hasUsedSpecial = true;
        resetActionState();
        setTimeout(() => endCurrentPlayerTurn(), 1000);
        return;
    }
} else {
    // Gérer les autres héros normalement
    const result = combatSystem.performSpecialPower(currentPlayer);
    message = result.message;
}

logToCombat(message);
gameState.hasUsedSpecial = true;

// Effet visuel spécifique au Ninja
if (currentPlayer.hero.name === "Ninja") {
    const ninjaElement = document.querySelector(`.player-${currentPlayer.player} .hero-image`);
    if (ninjaElement) {
        ninjaElement.classList.add('ninja-double-attack');
        setTimeout(() => ninjaElement.classList.remove('ninja-double-attack'), 1000);
    }
}

resetActionState();
enablePlayerControls();
}
 
function defend() {
    const currentPlayer = getCurrentPlayer();
    const isNinja = currentPlayer.hero.name === "Ninja";
    
    if (currentPlayer.hero.hp <= 0) {
        logToCombat(`${currentPlayer.hero.name} est KO et ne peut pas se défendre!`);
        return;
    }
    
    // Activer l'état de défense
    currentPlayer.hero.isDefending = true;
    currentPlayer.hero.defenseBonus = Math.floor(currentPlayer.hero.defense * 0.5); // +50% défense
    
    // Effet spécial pour le Ninja
    if (isNinja) {
        // Le Ninja a une chance d'esquiver automatiquement
        const dodgeRoll = lancerDe();
        if (dodgeRoll >= 4) { // 50% de chance (4,5,6)
            currentPlayer.hero.hasDodge = true;
            logToCombat(`${currentPlayer.hero.name} adopte une posture agile et est prêt à esquiver!`);
        } else {
            logToCombat(`${currentPlayer.hero.name} se met en position défensive (défense augmentée de 50%)`);
        }
    } else {
        logToCombat(`${currentPlayer.hero.name} se met en position défensive (défense augmentée de 50%)`);
    }
    
    // Effet visuel
    const heroElement = document.querySelector(`.player-${currentPlayer.player} .hero-image`);
    heroElement.classList.add('defending');
    setTimeout(() => heroElement.classList.remove('defending'), 1000);
    
    // Marquer que le joueur a utilisé sa défense ce tour
    gameState.hasDefended = true;
    
    // Pour tous les héros, la défense termine le tour
    resetActionState();
    setTimeout(() => endCurrentPlayerTurn(), 1000);
}
function resetActionState() {
    gameState.currentAction = null;
    gameState.attackTarget = null;
    gameState.attackType = null;
    gameState.adjacentEnemies = null;
    gameState.hasDoubleAttack = false;
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

function endTurn() {
    // Réinitialiser les états pour le prochain tour
    gameState.hasMovedThisTurn = false;
    gameState.hasAttacked = false;
    gameState.hasUsedSpecial = false;
    gameState.hasDefended = false;
    
    // Passer au joueur suivant
    gameState.currentPlayer = (gameState.currentPlayer % gameState.totalPlayers) + 1;
    
    // Préparer le nouveau tour
    beginTurn();
}

export function endCurrentPlayerTurn() {
    if (gameState.isPaused) return;

    const currentPlayer = getCurrentPlayer();
    logToCombat(`Joueur ${currentPlayer.player} (${currentPlayer.hero.name}) termine son tour`);

    updateCooldowns(gameState);

    // Réinitialiser les états pour le prochain tour
    currentPlayer.hero.isDefending = false;
    gameState.hasMovedThisTurn = false;
    gameState.hasAttacked = false;
    gameState.hasUsedSpecial = false;
    gameState.hasDefended = false;
    gameState.hasDoubleAttack = false;

    // Passer au joueur suivant vivant
    let nextIndex = gameState.currentPlayerIndex;
    const totalPlayers = gameState.turnOrder.length;

    for (let i = 0; i < totalPlayers; i++) {
        nextIndex = (nextIndex + 1) % totalPlayers;
        if (gameState.turnOrder[nextIndex].hero.hp > 0) {
            break;
        }
    }

    gameState.currentPlayerIndex = nextIndex;

    // Si on revient au premier joueur vivant, on peut considérer que le tour est complet
    if (gameState.currentPlayerIndex === 0) {
        gameState.currentTurn++;
    }

    // Vérifier s'il ne reste qu'un joueur
    const alivePlayers = gameState.turnOrder.filter(p => p.hero.hp > 0);
    if (alivePlayers.length === 1) {
        endGame();
        return;
    }

    setTimeout(() => {
        beginTurn();
    }, 500);
}


export function showScreen(screen) {
    gameState.currentState = screen;
    
    for (const [key, element] of Object.entries(uiElements.screens)) {
        element.style.display = 'none';
    }
    
    switch(screen) {
        case GAME_STATES.INTRO:
            uiElements.screens.Intro.style.display = 'block';
            break;
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

function logToCombat(message) {
    const entry = document.createElement('div');
    entry.textContent = message;
    uiElements.displays.combatLog.appendChild(entry);
    uiElements.displays.combatLog.scrollTop = uiElements.displays.combatLog.scrollHeight;
}

function getDiceFace(value) {
    const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return faces[value - 1] || '⚀';
}

function updateGameUI() {
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
        
        <p>Attaque: ${player.hero.power}</p>
        <p>Défense: ${player.hero.defense} ${player.hero.isDefending ? `(+${player.hero.defenseBonus})` : ''}</p>
        <p>Pouvoir spécial: ${player.hero.specialPower.name}</p>
        ${player.hero.specialPower.currentCooldown > 0 ? 
          `<p>Recharge: ${player.hero.specialPower.currentCooldown} tours</p>` : ''}
        ${player.hero.isDefending ? '<div class="defense-status">🛡️ En défense</div>' : ''}`;
        
        playerInfoContainer.appendChild(playerElement);
    });
}

function resetAttackUI() {
    uiElements.displays.attackDice.textContent = '⚀';
    document.getElementById('attack-result').textContent = '';
    document.getElementById('attack-result').className = 'attack-result';
    document.getElementById('attack-roll-button').disabled = false;
    document.querySelectorAll('.attack-type-btn').forEach(b => b.classList.remove('active'));
}

function endGame() {
    const winner = gameState.turnOrder[0];
    showVictoryModal(winner);
}

// Modifiez la fonction showEliminationModal
function showEliminationModal(player) {
    const modal = document.getElementById('elimination-modal');
    const message = document.getElementById('elimination-message');
    
    message.textContent = `Le Joueur ${player.player} (${player.hero.name}) a été éliminé!`;
    modal.style.display = 'flex';
    
    // Jouer le son d'élimination
    soundEffects.elimination.currentTime = 0;
    soundEffects.elimination.play();
    
    // Mettre le jeu en pause pendant que la modale est affichée
    gameState.isPaused = true;
}

// Modifiez la fonction showVictoryModal
function showVictoryModal(winner) {
    const modal = document.getElementById('victory-modal');
    const message = document.getElementById('victory-modal-message');
    
    message.textContent = `Le Joueur ${winner.player} (${winner.hero.name}) a gagné la partie!`;
    modal.style.display = 'flex';
    
    // Jouer le son de victoire
    soundEffects.victory.currentTime = 0;
    soundEffects.victory.play();
    
    // Mettre le jeu en pause
    gameState.isPaused = true;
}

// Gestionnaires d'événements pour les boutons des modales
document.getElementById('continue-after-elimination').addEventListener('click', () => {
    document.getElementById('elimination-modal').style.display = 'none';
    gameState.isPaused = false;
    
    // Vérifier s'il ne reste qu'un joueur
    if (gameState.turnOrder.length === 1) {
        showVictoryModal(gameState.turnOrder[0]);
    }
});

document.getElementById('restart-after-victory').addEventListener('click', () => {
    document.getElementById('victory-modal').style.display = 'none';
    restartGame();
});



