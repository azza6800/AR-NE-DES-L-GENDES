import { lancerDe } from './utils.js';
import { ATTACK_TYPES, DIRECTIONS } from './constants.js';

export class CombatSystem {
    constructor(arena, gameState) {
        this.arena = arena;
        this.gameState = gameState;
    }

    canAttack(attacker, defender, attackType) {
        const attackerPos = this.arena.findHeroPosition(attacker.player);
        const defenderPos = this.arena.findHeroPosition(defender.player);
        
        if (!attackerPos || !defenderPos) return false;

        const distance = this.calculateDistance(attackerPos, defenderPos);
        const heroType = attacker.hero.name;

        // Vérification de la portée selon le type de héros
        switch (heroType) {
            case "Chevalier":
            case "Ninja":
                return distance === 1; // Attaque seulement adjacente
            case "Sorcier":
                return distance >= 2 && distance <= 3 && 
                       this.isStraightLine(attackerPos, defenderPos);
            default:
                return false;
        }
    }

    calculateDistance(pos1, pos2) {
        return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y));
    }

    isStraightLine(pos1, pos2) {
        return pos1.x === pos2.x || pos1.y === pos2.y;
    }

    performAttack(attacker, defender, attackType) {
        if (!this.canAttack(attacker, defender, attackType)) {
            return {
                damage: 0,
                message: `${attacker.hero.name} ne peut pas atteindre ${defender.hero.name} depuis cette position!`,
                attacker: attacker,
                defender: defender
            };
        }

        const roll = lancerDe();
        let damage = 0;
        let message = `${attacker.hero.name} lance une attaque ${attackType === ATTACK_TYPES.HEAVY ? 'lourde' : 'rapide'}! `;
        
        // Tentative d'esquive (seulement pour le Ninja)
        if (this.attemptDodge(defender.hero)) {
            return { 
                damage: 0, 
                message: message + `${defender.hero.name} esquive l'attaque avec agilité!`,
                attacker: attacker,
                defender: defender
            };
        }

        // Calcul des dégâts de base selon le type d'attaque
        let baseDamage = attacker.hero.power;
        if (attackType === ATTACK_TYPES.HEAVY) {
            baseDamage = Math.floor(baseDamage * 1.5);
        }

        // Réduction des dégâts si le défenseur se défend
        if (defender.hero.isDefending) {
            baseDamage = Math.max(1, Math.floor(baseDamage * 0.5));
            message += `${defender.hero.name} se défend! `;
        }

        // Résultat de l'attaque basé sur le lancer de dé
        if (roll <= 2) {
            message += `${attacker.hero.name} rate son attaque!`;
        } else if (roll <= 5) {
            damage = baseDamage;
            message += `${attacker.hero.name} inflige ${damage} dégâts à ${defender.hero.name}!`;
        } else {
            damage = baseDamage * 2;
            message += `Coup critique! ${attacker.hero.name} inflige ${damage} dégâts à ${defender.hero.name}!`;
        }
        
        // Application des dégâts
        if (damage > 0) {
            defender.hero.hp = Math.max(0, defender.hero.hp - damage);
            this.gameState.needsRefresh = true;
            
            if (defender.hero.hp <= 0) {
                defender.hero.hp = 0;
                message += ` ${defender.hero.name} est éliminé!`;
                this.eliminatePlayer(defender);
            }
        }
        
        return { 
            damage, 
            message,
            attacker: attacker,
            defender: defender
        };
    }

    eliminatePlayer(player) {
        this.gameState.turnOrder = this.gameState.turnOrder.filter(p => p.player !== player.player);
        const position = this.arena.findHeroPosition(player.player);
        if (position) {
            this.arena.grid[position.y][position.x] = { type: 'empty' };
        }
    }

    performSpecialPower(player) {
        const hero = player.hero;
        if (hero.specialPower.currentCooldown > 0) {
            return { 
                success: false, 
                message: `${hero.name}: Pouvoir spécial en recharge (${hero.specialPower.currentCooldown} tours restants)` 
            };
        }

        const message = hero.specialPower.effect(player, this.gameState);
        
        switch (hero.name) {
            case "Chevalier":
                hero.specialPower.active = true;
                break;
            case "Ninja":
                player.hasDoubleAttack = true;
                break;
            case "Sorcier":
                this.performAreaAttack(player);
                break;
        }

        hero.specialPower.currentCooldown = hero.specialPower.cooldown;
        return { success: true, message };
    }

    performAreaAttack(player) {
        const position = this.arena.findHeroPosition(player.player);
        if (!position) return;

        let messages = [];
        
        // Attaque toutes les cases dans un rayon de 2 cases
        for (let y = Math.max(0, position.y - 2); y <= Math.min(this.arena.grid.length - 1, position.y + 2); y++) {
            for (let x = Math.max(0, position.x - 2); x <= Math.min(this.arena.grid[0].length - 1, position.x + 2); x++) {
                if ((x !== position.x || y !== position.y) && this.arena.grid[y][x].type === 'hero') {
                    const targetPlayer = this.gameState.turnOrder.find(
                        p => p.player !== player.player && 
                        this.arena.grid[y][x].hero.playerNumber === p.player
                    );
                    if (targetPlayer) {
                        const result = this.performAttack(player, targetPlayer, ATTACK_TYPES.QUICK);
                        messages.push(result.message);
                        this.gameState.needsRefresh = true;
                    }
                }
            }
        }
        
        return messages.join('\n');
    }

   attemptDodge(hero) {
    if (hero.name !== "Ninja") return false;
    const roll = lancerDe();
    return roll >= (hero.isDefending ? 5 : 4); // Esquive plus difficile en défense
}
    resetSpecialEffects(player) {
        const hero = player.hero;
        if (hero.specialPower?.reset) {
            hero.specialPower.reset();
        }
        if (hero.specialPower?.active) {
            hero.specialPower.active = false;
        }
        player.hasDoubleAttack = false;
        hero.isDefending = false;
    }
}