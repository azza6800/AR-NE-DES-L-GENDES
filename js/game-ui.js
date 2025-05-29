import { gameState } from './game_state.js';
import { arena } from './main-instances.js';
import { getDiceFace } from './ui-manager.js';
import { uiElements , showScreen, updateDisplay} from './ui-manager.js';


export function updateGameUI() {
    arena.render();
    updatePlayerInfo();
    updateHealthBars();
    enablePlayerControls();
}

export function updatePlayerInfo() {
    const container = document.getElementById('player-info');
    container.innerHTML = '';
    
    gameState.turnOrder.forEach(player => {
        const element = createPlayerElement(player);
        container.appendChild(element);
    });
}

function createPlayerElement(player) {
    const element = document.createElement('div');
    element.className = 'player-info';
    element.innerHTML = `
        <h3>Joueur ${player.player}: ${player.hero.name}</h3>
        <div class="health-container">
            <div class="health-bar ${getHealthClass(player)}" 
                 style="width: ${getHealthPercentage(player)}%">
                ${player.hero.hp}/${player.hero.maxHp}
            </div>
        </div>
        <p>Attaque: ${player.hero.power}</p>
        <p>Défense: ${player.hero.defense}</p>
    `;
    return element;
}

function getHealthPercentage(player) {
    return (player.hero.hp / player.hero.maxHp) * 100;
}

function getHealthClass(player) {
    return getHealthPercentage(player) < 30 ? 'danger' : '';
}

function updateHealthBars() {
    document.querySelectorAll('.health-bar').forEach(bar => {
        const playerNumber = bar.closest('.player-info')
            .querySelector('h3').textContent.match(/Joueur (\d+)/)[1];
        const player = gameState.turnOrder.find(p => p.player == playerNumber);
        
        if (player) {
            const percentage = getHealthPercentage(player);
            bar.style.width = `${percentage}%`;
            bar.className = `health-bar ${getHealthClass(player)}`;
            bar.textContent = `${player.hero.hp}/${player.hero.maxHp}`;
        }
    });
}

export function enablePlayerControls() {
    const currentPlayer = getCurrentPlayer();
    const position = arena.findHeroPosition(currentPlayer.player);
    
    uiElements.buttons.move.disabled = gameState.hasMovedThisTurn;
    uiElements.buttons.attack.disabled = shouldDisableAttack(currentPlayer, position);
    uiElements.buttons.special.disabled = shouldDisableSpecial(currentPlayer);
    uiElements.buttons.defend.disabled = gameState.hasMovedThisTurn;
}

function shouldDisableAttack(player, position) {
    if (player.hero.name === "Ninja") {
        return !gameState.hasMovedThisTurn || 
               arena.getAdjacentEnemies(player.player, position.x, position.y).length === 0;
    }
    return gameState.hasAttacked || gameState.hasMovedThisTurn;
}

function shouldDisableSpecial(player) {
    return player.hero.specialPower.currentCooldown > 0 || 
           gameState.hasMovedThisTurn;
}
export function showAttackRollScreen(attacker, defender) {
    uiElements.displays.attackRollAttacker.textContent = 
        `Attaquant: Joueur ${attacker.player} (${attacker.hero.name})`;
    uiElements.displays.attackRollDefender.textContent = 
        `Défenseur: Joueur ${defender.player} (${defender.hero.name})`;
    uiElements.displays.attackDice.textContent = '⚀';
    showScreen('ATTACK_ROLL');
}