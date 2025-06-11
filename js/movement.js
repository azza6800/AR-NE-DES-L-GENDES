export function getMovableCells(grid, hero, currentX, currentY) {
    const reachable = []; // Liste des cases atteignables
    const maxDistance = hero.speed; // Portée de déplacement
    const gridSize = grid.length; // Taille de la grille

    // Directions autorisées : haut, bas, gauche, droite
    const directions = [
        { dx: 0, dy: -1 }, // haut
        { dx: 0, dy: 1 },  // bas
        { dx: -1, dy: 0 }, // gauche
        { dx: 1, dy: 0 }   // droite
    ];

    // Pour chaque direction, vérifier jusqu'à "speed" cases
    directions.forEach(dir => {
        for (let step = 1; step <= maxDistance; step++) {
            const x = currentX + dir.dx * step;
            const y = currentY + dir.dy * step;

            // Sort de la grille → on arrête
            if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) break;
            
            const cell = grid[y][x];

            // Si la case est vide ou bonus → accessible
            if (cell === 'empty' || cell === 'bonus') {
                reachable.push({ x, y });
            } else {
                break; // Héros ou obstacle → bloquant → on arrête cette direction
            }
        }
    });

    return reachable;
}

export function getAttackableCells(grid, hero, currentX, currentY) {
    const attackable = []; // Liste des cases pouvant être attaquées
    const maxDistance = hero.range; // Portée d’attaque
    const gridSize = grid.length; // Taille de la grille

    // Directions autorisées pour l'attaque : haut, bas, gauche, droite
    const directions = [
        { dx: 0, dy: -1 }, // haut
        { dx: 0, dy: 1 },  // bas
        { dx: -1, dy: 0 }, // gauche
        { dx: 1, dy: 0 }   // droite
    ];

    // Parcourir chaque direction
    directions.forEach(dir => {
        for (let step = 1; step <= maxDistance; step++) {
            const x = currentX + dir.dx * step;
            const y = currentY + dir.dy * step;

            // Hors limites → on arrête
            if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) break;
            
            const cell = grid[y][x];

            // Si un héros ennemi est trouvé → attaquable
            if (typeof cell === 'object' && cell.type === 'hero' && cell.hero.playerNumber !== hero.playerNumber) {
                attackable.push({ x, y });
                break; // On ne peut pas tirer à travers l’ennemi
            } else if (cell === 'obstacle') {
                break; // L'obstacle bloque la ligne d'attaque
            }
        }
    });

    return attackable;
}
