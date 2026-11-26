import type { ShipType } from './types';

// tints multiply linear albedo, so black canvas is a very small number
const BLACK = [0.045, 0.04, 0.045],
    WHITE = [1, 0.98, 0.92],
    TAN = [0.9, 0.78, 0.58];

/** The player's hulls before upgrades, smallest first. */
export const CLASSES: ShipType[] = [
    { name: 'Sloop', hull: 0, scale: 1, hp: 100, speed: 15, turn: 0.56, dmg: 9, reload: 3.2, shot: 74, spread: 0.035, loot: 0, renown: 0, paint: [0.72, 0.1, 0.08], canvas: BLACK },
    { name: 'Brig', hull: 1, scale: 1, hp: 190, speed: 14.2, turn: 0.44, dmg: 10, reload: 3.4, shot: 76, spread: 0.035, loot: 0, renown: 0, paint: [0.72, 0.1, 0.08], canvas: BLACK },
    { name: 'Galleon', hull: 2, scale: 1, hp: 330, speed: 13.4, turn: 0.34, dmg: 11, reload: 3.6, shot: 78, spread: 0.035, loot: 0, renown: 0, paint: [0.72, 0.1, 0.08], canvas: BLACK },
];
/** Hold capacity of each class, in gold. */
export const HOLDS = [300, 650, 1200];
/** Crew each class can berth before any living quarters are built into her. */
export const BERTHS = [2, 3, 4];
/** Price of each class at the shipyard; the sloop is where everyone starts. */
export const CLASS_COST = [0, 1600, 5200];

/** A hired consort: sails in the player's wake and fights alongside. */
export const ESCORT: ShipType = { name: 'Consort', hull: 0, scale: 1, hp: 130, speed: 16, turn: 0.6, dmg: 8, reload: 4, shot: 72, spread: 0.06, loot: 0, renown: 0, paint: [0.72, 0.1, 0.08], canvas: [0.14, 0.13, 0.14] };
export const ESCORT_COST = 700;
export const MAX_ESCORTS = 2;

export const FOES = {
    /** fat, slow and nearly unarmed: runs when fired on */
    trader: { name: 'Merchantman', hull: 0, scale: 1.05, hp: 70, speed: 9.5, turn: 0.4, dmg: 5, reload: 6, shot: 64, spread: 0.1, loot: 150, renown: 2, paint: [0.8, 0.62, 0.22], canvas: TAN },
    /** a rich prize that can bite back */
    treasure: { name: 'Treasure Galleon', hull: 2, scale: 0.92, hp: 300, speed: 8.6, turn: 0.26, dmg: 7, reload: 6.5, shot: 68, spread: 0.09, loot: 800, renown: 8, paint: [0.8, 0.62, 0.22], canvas: TAN },
    cutter: { name: 'Navy Cutter', hull: 0, scale: 1, hp: 95, speed: 13.6, turn: 0.52, dmg: 6, reload: 4.8, shot: 70, spread: 0.075, loot: 90, renown: 3, paint: [0.12, 0.24, 0.6], canvas: WHITE },
    frigate: { name: 'Navy Frigate', hull: 1, scale: 1.04, hp: 240, speed: 12.4, turn: 0.38, dmg: 8, reload: 5.2, shot: 74, spread: 0.065, loot: 260, renown: 6, paint: [0.12, 0.24, 0.6], canvas: WHITE },
    flagship: { name: 'The Admiral', hull: 2, scale: 1.22, hp: 1100, speed: 11.6, turn: 0.26, dmg: 10, reload: 5, shot: 80, spread: 0.055, loot: 3000, renown: 0, paint: [0.85, 0.66, 0.16], canvas: [0.62, 0.1, 0.08] },
} satisfies Record<string, ShipType>;

export interface Upgrade {
    name: string;
    /** what one level buys, as shown in the shipyard */
    effect: string;
    /** price of the first level; each further level costs GROWTH times the last */
    cost: number;
    /** how many levels it can be taken to: MAX_LEVEL when left out. A list is the limit for each class of hull, smallest first */
    max?: number | number[];
}
/** Shipyard upgrades. Their order is the order of Progress.levels, so new ones only go on the end. */
export const UPGRADES: Upgrade[] = [
    { name: 'Hull', effect: '+18% hull strength a level', cost: 120 },
    { name: 'Cannons', effect: '+14% shot damage a level', cost: 150 },
    { name: 'Gun tackle', effect: '−9% reload time a level', cost: 130 },
    { name: 'Sails', effect: '+6% speed a level', cost: 110 },
    { name: 'Rudder', effect: '+10% turn rate a level', cost: 90 },
    { name: 'Hold', effect: '+40% plunder carried a level', cost: 100 },
    // ---- works: decks built into her, which change her shape as well as her figures ----
    { name: 'Gun deck', effect: 'A lower tier of guns, half as many again · −8% speed, −10% handling', cost: 2400, max: 1 },
    { name: 'Living quarters', effect: '+2 berths for crew a level · −2% speed', cost: 500, max: [1, 2, 3] },
];
export const UP = { HULL: 0, CANNONS: 1, TACKLE: 2, SAILS: 3, RUDDER: 4, HOLD: 5, GUNDECK: 6, QUARTERS: 7 } as const;
export const MAX_LEVEL = 5;
/**
 * How many levels an improvement can be taken to: on the hull of class `cls`, or on the hull that
 * takes the most of it when no class is given. Levels are kept from hull to hull, so a small hull
 * may have more paid for than she can carry.
 */
export function maxLevel(id: number, cls?: number): number {
    const max = UPGRADES[id].max ?? MAX_LEVEL;
    if (typeof max === 'number') return max;
    return cls === undefined ? Math.max(...max) : max[cls];
}
const GROWTH = 1.62;

export const upgradeCost = (id: number, level: number) => Math.round((UPGRADES[id].cost * Math.pow(GROWTH, level)) / 10) * 10;

/** Renown needed for each level of infamy, and what the last one brings. */
export const INFAMY = [0, 6, 16, 32, 54, 80];
export const infamyOf = (renown: number) => {
    let level = 0;
    while (level < INFAMY.length - 1 && renown >= INFAMY[level + 1]) level++;
    return level;
};
