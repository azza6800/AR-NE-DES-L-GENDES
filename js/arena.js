import { getMovableCells, getAttackableCells } from './movement.js';
import { CELL_TYPES } from './constants.js';

export class Arena {
    constructor() {
        this.gridSize = 7; // Taille de la grille (7x7)
        this.grid = this.createGrid(); // Génère la grille avec obstacles et bonus
        this.cellElements = []; // Tableau contenant les éléments HTML des cellules
        this.render(); // Affiche l’arène dans le DOM
    }

    // Création de la grille logique avec contenu aléatoire
    createGrid() {
        const grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                const rand = Math.random();
                const isCorner = (x === 0 && y === 0) || (x === 6 && y === 0) || 
                                 (x === 0 && y === 6) || (x === 6 && y === 6);

                // Coin → toujours vide, sinon génération aléatoire
                grid[y][x] = isCorner
                    ? CELL_TYPES.EMPTY
                    : rand < 0.1 ? CELL_TYPES.OBSTACLE :
                      rand < 0.3 ? CELL_TYPES.BONUS : CELL_TYPES.EMPTY;
            }
        }
        return grid;
    }

    // Affichage graphique de la grille dans le DOM
    render() {
        const arenaElement = document.getElementById('arena'); // Élément conteneur
        arenaElement.innerHTML = ''; // Vide l’arène avant réaffichage
        this.cellElements = [];

        // Parcours de toutes les cases
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = document.createElement('div'); // Création de la cellule HTML
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                const cellData = this.grid[y][x]; // Récupération des données de la cellule

                if (cellData === CELL_TYPES.OBSTACLE) {
                    // Obstacle → ajout de classe + icône
                    cell.classList.add('obstacle');
                    cell.innerHTML = '<div class="icon">⛔</div>';
                } else if (cellData === CELL_TYPES.BONUS) {
                    // Bonus → image animée
                    cell.classList.add('bonus');
                    const img = document.createElement('img');
                    img.src = 'assets/images/bonus.gif';
                    img.alt = 'Bonus';
                    img.classList.add('bonus-img');
                    cell.appendChild(img);
                } else if (typeof cellData === 'object' && cellData.type === 'hero') {
                    // Héros → image, couleur, barre de vie
                    const hero = cellData.hero;
                    cell.classList.add('hero');
                    cell.style.backgroundColor = hero.color;

                    const img = document.createElement('img');
                    img.src = hero.image;
                    img.alt = hero.name;
                    img.classList.add('hero-img');
                    cell.appendChild(img);

                    // Barre de vie avec texte et couleur si PV faibles
                    const healthContainer = document.createElement('div');
                    healthContainer.className = 'health-container';

                    const healthBar = document.createElement('div');
                    healthBar.className = 'health-bar';
                    if (hero.hp / hero.maxHp < 0.3) healthBar.classList.add('danger');
                    healthBar.style.width = `${(hero.hp / hero.maxHp) * 100}%`;

                    const healthText = document.createElement('div');
                    healthText.className = 'health-text';
                    healthText.textContent = `${hero.hp}/${hero.maxHp}`;

                    healthContainer.appendChild(healthBar);
                    healthContainer.appendChild(healthText);
                    cell.appendChild(healthContainer);

                    // Curseur visible si c’est le joueur
                    if (hero.isPlayer) {
                        cell.style.cursor = 'pointer';
                    }
                } else {
                    // Cellule vide → affiche les coordonnées
                    cell.innerHTML = `<small>${x},${y}</small>`;
                }

                this.cellElements.push(cell); // Sauvegarde l’élément
                arenaElement.appendChild(cell); // Ajoute au DOM
            }
        }
    }

    // Surbrillance des cellules accessibles au héros
    highlightMovableCells(hero, currentX, currentY) {
        this.clearHighlights();
        const reachable = getMovableCells(this.grid, hero, currentX, currentY);

        reachable.forEach(({ x, y }) => {
            const index = y * this.gridSize + x;
            const cell = this.cellElements[index];
            cell.classList.add('movable');
            cell.dataset.action = 'move';
        });
    }

    // Surbrillance des ennemis attaquables
    highlightAttackableCells(hero, currentX, currentY) {
        this.clearHighlights();
        const attackable = getAttackableCells(this.grid, hero, currentX, currentY);

        attackable.forEach(({ x, y }) => {
            const index = y * this.gridSize + x;
            const cell = this.cellElements[index];
            cell.classList.add('attackable');
            cell.dataset.action = 'attack';
        });
    }

    // Supprime les surbrillances de toutes les cases
    clearHighlights() {
        this.cellElements.forEach(cell => {
            cell.classList.remove('movable', 'attackable');
            delete cell.dataset.action;
        });
    }

    // Déplace le héros sur une nouvelle case et applique un bonus si nécessaire
    moveHero(fromX, fromY, toX, toY) {
        const heroData = this.grid[fromY][fromX];
        const cellData = this.grid[toY][toX];

        this.grid[toY][toX] = heroData;
        this.grid[fromY][fromX] = CELL_TYPES.EMPTY;

        if (cellData === CELL_TYPES.BONUS) {
            this.applyBonus(heroData.hero); // Applique un effet bonus
        }

        this.clearHighlights();
        this.render();
        return cellData === CELL_TYPES.BONUS;
    }

    // Applique un bonus aléatoire au héros
    applyBonus(hero) {
        const bonuses = [
            { effect: () => { hero.hp = Math.min(hero.hp + 20, hero.maxHp); }, message: "+20 HP" },
            { effect: () => { hero.power += 5; }, message: "+5 Puissance" }
        ];

        const bonus = bonuses[Math.floor(Math.random() * bonuses.length)];
        bonus.effect();
        return bonus.message;
    }

    // Renvoie les positions des ennemis adjacents (haut/bas/gauche/droite)
    getAdjacentEnemies(playerNumber, x, y) {
        const enemies = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (this.isValidCell(nx, ny)) {
                const cell = this.grid[ny][nx];
                if (cell?.type === 'hero' && cell.hero.playerNumber !== playerNumber) {
                    enemies.push({ x: nx, y: ny });
                }
            }
        }

        return enemies;
    }

    // Vérifie que les coordonnées sont valides dans la grille
    isValidCell(x, y) {
        return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize;
    }

    // Donne les positions de départ dans les coins pour chaque joueur
    getStartingPositions(playerCount) {
        const positions = [];
        const corners = [
            [0, 0], [this.gridSize - 1, 0],
            [0, this.gridSize - 1], [this.gridSize - 1, this.gridSize - 1]
        ];

        for (let i = 0; i < playerCount; i++) {
            positions.push(corners[i]);
        }

        return positions;
    }

    // Cherche la position d’un héros selon son numéro de joueur
    findHeroPosition(playerNumber) {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (typeof cell === 'object' && cell.type === 'hero' &&
                    cell.hero.playerNumber === playerNumber) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    // Met en surbrillance une cellule particulière pour attaque ou déplacement
    highlightCell(x, y, type) {
        const index = y * this.gridSize + x;
        const cell = this.cellElements[index];
        cell.classList.add(type);
        cell.dataset.action = type === 'movable' ? 'move' : 'attack';
    }

    // Cas spécifique : le sorcier peut attaquer à distance entre 2 et 3 cases
    getSorcierAttackableCells(playerNumber, x, y) {
        const attackableCells = [];
        const directions = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
        ];

        directions.forEach(dir => {
            for (let dist = 2; dist <= 3; dist++) {
                const nx = x + dir.dx * dist;
                const ny = y + dir.dy * dist;

                if (this.isValidCell(nx, ny)) {
                    const cell = this.grid[ny][nx];
                    if (cell?.type === 'hero' && cell.hero.playerNumber !== playerNumber) {
                        attackableCells.push({ x: nx, y: ny });
                        break; // S’arrête dès qu’un ennemi est trouvé
                    }
                }
            }
        });

        return attackableCells;
    }
}
