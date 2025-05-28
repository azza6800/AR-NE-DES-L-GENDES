export function getMovableCells(grid, hero, currentX, currentY) {
    const reachable = [];
    const maxDistance = hero.speed;
    const gridSize = grid.length;

    const directions = [
        { dx: 0, dy: -1 }, // haut
        { dx: 0, dy: 1 },  // bas
        { dx: -1, dy: 0 }, // gauche
        { dx: 1, dy: 0 }   // droite
    ];

    directions.forEach(dir => {
        for (let step = 1; step <= maxDistance; step++) {
            const x = currentX + dir.dx * step;
            const y = currentY + dir.dy * step;

            if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) break;
            
            const cell = grid[y][x];
            if (cell === 'empty' || cell === 'bonus') {
                reachable.push({ x, y });
            } else {
                break; // Obstacle ou héros bloque le chemin
            }
        }
    });

    return reachable;
}

export function getAttackableCells(grid, hero, currentX, currentY) {
    const attackable = [];
    const maxDistance = hero.range;
    const gridSize = grid.length;

    // Attaque en ligne droite dans les 4 directions
    const directions = [
        { dx: 0, dy: -1 }, // haut
        { dx: 0, dy: 1 },  // bas
        { dx: -1, dy: 0 }, // gauche
        { dx: 1, dy: 0 }   // droite
    ];

    directions.forEach(dir => {
        for (let step = 1; step <= maxDistance; step++) {
            const x = currentX + dir.dx * step;
            const y = currentY + dir.dy * step;

            if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) break;
            
            const cell = grid[y][x];
            if (typeof cell === 'object' && cell.type === 'hero' && cell.hero.playerNumber !== hero.playerNumber) {
                attackable.push({ x, y });
                break; // On ne peut pas attaquer à travers un ennemi
            } else if (cell === 'obstacle') {
                break; // Les obstacles bloquent les attaques
            }
        }
    });

    return attackable;
}