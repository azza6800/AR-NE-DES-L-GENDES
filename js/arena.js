import { getMovableCells, getAttackableCells } from './movement.js';
import { CELL_TYPES } from './constants.js';

export class Arena {
    constructor() {
        this.gridSize = 7;
        this.grid = this.createGrid();
        this.cellElements = [];
        this.render();
    }

    createGrid() {
        const grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                const rand = Math.random();
                const isCorner = (x === 0 && y === 0) || (x === 6 && y === 0) || 
                               (x === 0 && y === 6) || (x === 6 && y === 6);

                grid[y][x] = isCorner
                    ? CELL_TYPES.EMPTY
                    : rand < 0.2 ? CELL_TYPES.OBSTACLE :
                      rand < 0.3 ? CELL_TYPES.BONUS : CELL_TYPES.EMPTY;
            }
        }
        return grid;
    }
    

   render() {
    const arenaElement = document.getElementById('arena');
    arenaElement.innerHTML = '';
    this.cellElements = [];

    for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;

            const cellData = this.grid[y][x];

            if (cellData === CELL_TYPES.OBSTACLE) {
                cell.classList.add('obstacle');
                cell.innerHTML = '<div class="icon">⛔</div>';
            } else if (cellData === CELL_TYPES.BONUS) {
                cell.classList.add('bonus');
                const img = document.createElement('img');
                img.src = 'assets/images/bonus.gif';
                img.alt = 'Bonus';
                img.classList.add('bonus-img');
                cell.appendChild(img);
            } else if (typeof cellData === 'object' && cellData.type === 'hero') {
                const hero = cellData.hero;
                cell.classList.add('hero');
                cell.style.backgroundColor = hero.color;
                
                const img = document.createElement('img');
                img.src = hero.image;
                img.alt = hero.name;
                img.classList.add('hero-img');
                cell.appendChild(img);

                // Barre de vie améliorée
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

                if (hero.isPlayer) {
                    cell.style.cursor = 'pointer';
                }
            } else {
                cell.innerHTML = `<small>${x},${y}</small>`;
            }

            this.cellElements.push(cell);
            arenaElement.appendChild(cell);
        }
    }
}

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

    clearHighlights() {
        this.cellElements.forEach(cell => {
            cell.classList.remove('movable', 'attackable');
            delete cell.dataset.action;
        });
    }

    moveHero(fromX, fromY, toX, toY) {
        const heroData = this.grid[fromY][fromX];
        const cellData = this.grid[toY][toX];
        
        this.grid[toY][toX] = heroData;
        this.grid[fromY][fromX] = CELL_TYPES.EMPTY;

        if (cellData === CELL_TYPES.BONUS) {
            this.applyBonus(heroData.hero);
        }

        this.clearHighlights();
        this.render();
        return cellData === CELL_TYPES.BONUS;
    }

    applyBonus(hero) {
        const bonuses = [
            { effect: () => { hero.hp = Math.min(hero.hp + 20, hero.maxHp); }, message: "+20 HP" },
            { effect: () => { hero.speed += 1; }, message: "+1 Vitesse" },
            { effect: () => { hero.power += 5; }, message: "+5 Puissance" }
        ];
        
        const bonus = bonuses[Math.floor(Math.random() * bonuses.length)];
        bonus.effect();
        return bonus.message;
        
    }
    
  getAdjacentEnemies(playerNumber, x, y) {
    const enemies = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Haut, bas, gauche, droite
    
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

// Et ajoutez aussi cette méthode utilitaire si elle n'existe pas déjà
isValidCell(x, y) {
    return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize;
}

    getStartingPositions(playerCount) {
        const positions = [];
        const corners = [
            [0, 0], [this.gridSize-1, 0], 
            [0, this.gridSize-1], [this.gridSize-1, this.gridSize-1]
        ];
        
        for (let i = 0; i < playerCount; i++) {
            positions.push(corners[i]);
        }
        
        return positions;
    }

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
    
}