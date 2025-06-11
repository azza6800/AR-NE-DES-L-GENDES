export const HEROES = {
    knight: {
        name: "Chevalier",
        hp: 100,
        maxHp: 100,
        speed: 1,
        range: 1,
        power: 25,
        defense: 15,
        canMoveAndAttack: false, 
        canDefend: true,
        defenseBonus: 0,// Ne peut pas bouger et attaquer
        specialPower: {
            name: "Cri de guerre",
            description: "Augmente les dégâts de 50% pour ce tour",
            cooldown: 3,
            currentCooldown: 0,
            effect: function() {
                this.powerBonus = Math.floor(this.power * 0.5);
                this.power += this.powerBonus;
                return `${this.name} crie et augmente sa puissance de 50% pour ce tour!`;
            },
            defenseEffect: function() {
                // Bonus spécial de défense pour le chevalier
                this.defenseBonus = Math.floor(this.defense * 0.75); // +75% au lieu de 50%
                return `${this.name} adopte une posture défensive renforcée!`;
            },
            reset: function() {
                if (this.powerBonus) {
                    this.power -= this.powerBonus;
                    this.powerBonus = 0;
                }
            }
        },
        image: "assets/images/Chevalier.gif",
        color: "#f8bb22"
    },
    ninja: {
        name: "Ninja",
        hp: 70,
        maxHp: 70,
        speed: 2,
        range: 1,
        power: 20,
        defense: 10,
        canMoveAndAttack: true,
        canDefend: true,
        defenseBonus: 0,
        specialPower: {
            name: "Double Attack",
            description: "Permet d'attaquer deux fois ce tour",
            cooldown: 3,  // 3 tours de recharge
            currentCooldown: 0,
            effect: function() {
                return `${this.name} se prépare à frapper deux fois!`;
            },
            defenseEffect: function() {
                // Le ninja a plus de chance d'esquiver
                return `${this.name} se prépare à esquiver les attaques!`;
            },
            reset: function() {
                // Pas besoin de reset ici, géré dans gameState
            }
        },
        image: "assets/images/ninja.gif",
        color: "#e91e63"
    },
    sorcerer: {
        name: "Sorcier",
        hp: 80,
        maxHp: 80,
        speed: 1,
        range: 3, 
        power: 30,
        defense: 5,
        canMoveAndAttack: false,
        canDefend: true,
        defenseBonus: 0, // Ne peut pas bouger et attaquer
        specialPower: {
            name: "Tempête magique",
            description: "Attaque toutes les cases adjacentes",
            cooldown: 3,
            currentCooldown: 0,
            effect: function() {
                return `${this.name} invoque une tempête magique sur les cases adjacentes!`;
            },
            defenseEffect: function() {
                // Le sorcier peut créer un bouclier magique
                this.defenseBonus = Math.floor(this.defense * 1); // +100%
                return `${this.name} invoque un bouclier magique!`;
            }
        },
        image: "assets/images/Sorcier.gif",
        color: "#9c27b0"
    }
};