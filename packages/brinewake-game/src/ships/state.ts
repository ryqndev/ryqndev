import { m4 } from '@ryqndev/kiln-math';

import type { Ship } from './types';

/**
 * Floats per ball in flight: position, velocity, hull damage, team, age, 1 when the player's own guns
 * fired it, which of SHOT it is, what it does to a crew and to sails, and how much of it stone takes.
 */
export const BALL_STRIDE = 14;
export const BALL_CAPACITY = 480;

/** A crate or cask of plunder adrift. */
export interface Loot {
    x: number;
    z: number;
    vx: number;
    vz: number;
    value: number;
    life: number;
    seed: number;
    /** 0 crate, 1 cask */
    kind: number;
}

/** One of the king's forts: stone that shoots back, and can be sacked. Run by forts.ts. */
export interface Fort {
    name: string;
    x: number;
    z: number;
    /** radius of its walls, and the height of their tops */
    r: number;
    top: number;
    hp: number;
    max: number;
    /** seconds until its guns have reloaded */
    left: number;
    /** seconds until its garrison is back and its walls are made good; 0 while it stands */
    down: number;
    /** where its treasure is thrown when it falls, as [x, z] */
    spill: number[];
}

export interface Director {
    /** seconds until the next look at who is at sea, and until the next hunters set out */
    spawnT: number;
    huntT: number;
    flagship: Ship | null;
    /** infamy level last announced */
    level: number;
}

// Live entities. Plain arrays mutated in place: the simulation is a module singleton.
export const ships: Ship[] = [];
export const loot: Loot[] = [];
/** Every fort on the chart, standing or sacked. Filled by resetForts(). */
export const forts: Fort[] = [];
/** Shot in flight, packed BALL_STRIDE floats each so that a broadside allocates nothing. */
export const balls = { d: new Float32Array(BALL_CAPACITY * BALL_STRIDE), n: 0 };

export const D: Director = { spawnT: 0, huntT: 60, flagship: null, level: 0 };

// scratch matrices shared by the ship modules (never held across calls)
export const B = m4(),
    Lm = m4(),
    Tm = m4();
