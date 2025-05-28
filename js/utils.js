export function lancerDe(sides = 6) {
    return Math.floor(Math.random() * sides) + 1;
}

export function getOppositeDirection(dir) {
    const opposites = {
        'up': 'down',
        'down': 'up',
        'left': 'right',
        'right': 'left'
    };
    return opposites[dir] || dir;
}

export function updateCooldowns(gameState) {
    gameState.turnOrder.forEach(player => {
        if (player.hero.specialPower.currentCooldown > 0) {
            player.hero.specialPower.currentCooldown--;
        }
    });
}

export function resetSpecialEffects(gameState) {
    gameState.turnOrder.forEach(player => {
        if (player.hero.specialPower.reset) {
            player.hero.specialPower.reset();
        }
        player.hero.isDefending = false;
    });
}