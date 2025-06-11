
import { lancerDe } from './utils.js';
import { ATTACK_TYPES, DIRECTIONS } from './constants.js';

export class CombatSystem {
    constructor(arena, gameState) {
        this.arena = arena;
        this.gameState = gameState;
    }

    // Vérifie si un héros peut attaquer une cible selon son type
    canAttack(attacker, defender, attackType) {
    const attackerPos = this.arena.findHeroPosition(attacker.player);
    const defenderPos = this.arena.findHeroPosition(defender.player);
    if (!attackerPos || !defenderPos) return false;

    const distance = this.calculateDistance(attackerPos, defenderPos);
    const heroType = attacker.hero.name;

    switch (heroType) {
        case "Chevalier":
        case "Ninja":
            return distance === 1; // Attaque au corps à corps
        case "Sorcier":
            // Permet attaque en mêlée ET attaque magique à distance 2-3 en ligne droite
            return (
                distance === 1 || 
                ((distance === 2 || distance === 3) && this.isStraightLine(attackerPos, defenderPos))
            );
        default:
            return false;
    }
}


    // Calcule la distance entre deux positions (distance de Manhattan simplifiée)
    calculateDistance(pos1, pos2) {
        return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y));
    }

    // Vérifie si deux positions sont alignées en ligne droite
    isStraightLine(pos1, pos2) {
        return pos1.x === pos2.x || pos1.y === pos2.y;
    }

    // Effectue une attaque entre deux héros
    performAttack(attacker, defender, attackType, rollValue = null) {
        if (!this.canAttack(attacker, defender, attackType)) {
            return {
                damage: 0,
                message: `${attacker.hero.name} ne peut pas atteindre ${defender.hero.name} depuis cette position!`,
                attacker,
                defender
            };
        }

        const roll = rollValue || lancerDe();
        let damage = 0;
        let message = `${attacker.hero.name} lance une attaque ${attackType === ATTACK_TYPES.HEAVY ? 'lourde' : 'rapide'}! `;

        // Vérifie l'esquive du défenseur
        if (this.attemptDodge(defender.hero)) {
            const defenderElement = document.querySelector(`.player-${defender.player} .hero-image`);
            defenderElement.classList.add('ninja-dodge');
            setTimeout(() => defenderElement.classList.remove('ninja-dodge'), 500);

            return {
                damage: 0,
                message: message + `${defender.hero.name} esquive l'attaque avec agilité! (Jet: ${roll})`,
                attacker,
                defender
            };
        }

        // Calcule les dégâts de base selon le type d'attaque
        let baseDamage = attacker.hero.power;
        if (attackType === ATTACK_TYPES.HEAVY) {
            baseDamage = Math.floor(baseDamage * 1.5);
        }

        // Applique la réduction de défense du défenseur
        let defenseValue = defender.hero.defense;
        if (defender.hero.isDefending) {
            defenseValue += defender.hero.defenseBonus;
        }

        const damageReduction = Math.max(1, Math.floor(defenseValue / 2));
        baseDamage = Math.max(1, baseDamage - damageReduction);

        // Détermine le résultat du jet d'attaque
        if (roll <= 2) {
            message += `${attacker.hero.name} rate son attaque!`;
        } else if (roll <= 5) {
            damage = baseDamage;
            message += `${attacker.hero.name} inflige ${damage} dégâts à ${defender.hero.name}!`;
        } else {
            damage = baseDamage * 2;
            message += `Coup critique! ${attacker.hero.name} inflige ${damage} dégâts à ${defender.hero.name}!`;
        }

        // Applique les dégâts et gère la mort éventuelle du défenseur
        if (damage > 0) {
            defender.hero.hp = Math.max(0, defender.hero.hp - damage);
            this.gameState.needsRefresh = true;

            if (defender.hero.hp <= 0) {
                message += ` ${defender.hero.name} est éliminé!`;
                this.eliminatePlayer(defender);
            }
        }

        return {
            damage,
            message,
            attacker,
            defender
        };
    }

    // Active le pouvoir spécial du héros
    performSpecialPower(player) {
        const hero = player.hero;

        if (hero.specialPower.currentCooldown > 0) {
            return {
                success: false,
                message: `${hero.name}: Pouvoir spécial en recharge (${hero.specialPower.currentCooldown} tours restants)`
            };
        }

        let message = "";
    
        const attackResults = [];

        switch (hero.name) {
            case "Chevalier":
                hero.powerBonus = Math.floor(hero.power * 0.5);
                hero.power += hero.powerBonus;
                message = `${hero.name} active ${hero.specialPower.name}! Dégâts augmentés de 50% pour ce tour.`;
                break;
            case "Sorcier":
                const position = this.arena.findHeroPosition(player.player);
                if (position) {
                    // Attaque magique dans les 4 directions à distance 2 et 3
                    const directions = [
                        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                    ];
                    directions.forEach(dir => {
                        for (let dist = 2; dist <= 3; dist++) {
                            const nx = position.x + dir.dx * dist;
                            const ny = position.y + dir.dy * dist;
                            if (this.arena.isValidCell(nx, ny)) {
                                const cell = this.arena.grid[ny][nx];
                                if (cell?.type === 'hero' && cell.hero.playerNumber !== player.player) {
                                    const target = this.gameState.turnOrder.find(
                                        p => p.player === cell.hero.playerNumber
                                    );
                                    if (target) {
                                        const damage = Math.floor(hero.power * 0.75);
                                        target.hero.hp = Math.max(0, target.hero.hp - damage);
                                        attackResults.push(`${hero.name} frappe ${target.hero.name} (${damage} dégâts)`);
                                        if (target.hero.hp <= 0) {
                                            this.eliminatePlayer(target);
                                            attackResults.push(`${target.hero.name} est éliminé!`);
                                        }
                                        break; // 1 ennemi max par direction
                                    }
                                }
                            }
                        }
                    });
                }
                message = attackResults.length > 0
                    ? `${hero.name} invoque une tempête magique!\n${attackResults.join('\n')}`
                    : `${hero.name} invoque une tempête magique mais ne touche personne!`;
                break;
        }

        hero.specialPower.currentCooldown = hero.specialPower.cooldown;
        this.gameState.needsRefresh = true;

        return {
            success: true,
            message,
            targets: attackResults
        };
    }

    // Élimine un joueur du jeu
    eliminatePlayer(player) {
        this.gameState.turnOrder = this.gameState.turnOrder.filter(p => p.player !== player.player);
        const position = this.arena.findHeroPosition(player.player);
        if (position) {
            this.arena.grid[position.y][position.x] = { type: 'empty' };
        }
    }

    // Tente une esquive pour le héros
    attemptDodge(hero) {
        if (hero.name === "Ninja" && hero.hasDodge) {
            hero.hasDodge = false;
            return true;
        }
        if (hero.isDefending) {
            const roll = lancerDe();
            return roll >= 5; // Esquive sur 5 ou 6
        }
        return false;
    }

    // Réinitialise les effets temporaires (défense, pouvoir)
    resetSpecialEffects(player) {
        const currentPlayer = getCurrentPlayer();
        if (currentPlayer.hero.isDefending) {
            currentPlayer.hero.isDefending = false;
            currentPlayer.hero.defenseBonus = 0;
            currentPlayer.hero.hasDodge = false;
        }

        const hero = player.hero;
        if (hero.specialPower?.reset) {
            hero.specialPower.reset();
        }

        hero.isDefending = false;

        if (hero.powerBonus) {
            hero.power -= hero.powerBonus;
            hero.powerBonus = 0;
        }
    }
}
