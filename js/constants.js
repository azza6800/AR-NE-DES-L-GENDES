export const CELL_TYPES = {
    EMPTY: 'empty',
    HERO: 'hero',
    OBSTACLE: 'obstacle',
    BONUS: 'bonus'
};

export const DIRECTIONS = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
};

export const ACTIONS = {
    MOVE: 'move',
    ATTACK: 'attack',
    SPECIAL: 'special',
    DEFEND: 'defend',
    DODGE: 'dodge',
    INTERACT: 'interact',
    PASS:'pass'
};

export const ATTACK_TYPES = {
    QUICK: 'quick',
    HEAVY: 'heavy'
};

export const GAME_STATES = {
    INTRO: 'intro-screen',
    SELECT_PLAYERS: 'select_players',
    SELECT_HEROES: 'select_heroes',
    DICE_ROLL: 'dice_roll',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    
};