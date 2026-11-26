import { m4 } from '@ryqndev/kiln-math';

import type { Ship } from './types';

/** Floats per cannonball: position, velocity, damage, team, age, and 1 when the player's own guns fired it. */
export const BALL_STRIDE = 10;
export const BALL_CAPACITY = 320;

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
/** Shot in flight, packed BALL_STRIDE floats each so that a broadside allocates nothing. */
export const balls = { d: new Float32Array(BALL_CAPACITY * BALL_STRIDE), n: 0 };

export const D: Director = { spawnT: 0, huntT: 60, flagship: null, level: 0 };

// scratch matrices shared by the ship modules (never held across calls)
export const B = m4(),
    Lm = m4(),
    Tm = m4();
