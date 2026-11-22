import type { Shockwave } from '@ryqndev/rimefire-renderer';

export type Mode = 'title' | 'play' | 'pause' | 'dead' | 'win';

export interface Stats {
    det: number;
    best: number;
    kills: number;
    time: number;
}

export interface Player {
    /** feet position */
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    yaw: number;
    pitch: number;
    hp: number;
    /** seconds since last hurt; health regenerates after a delay */
    hurtT: number;
    ground: boolean;
    coyote: number;
    jbuf: number;
    jheld: boolean;
    /** 0 gelcaster, 1 striker. `next` is the weapon being swapped to, `sw` the swap progress 0..1 */
    weapon: number;
    next: number;
    sw: number;
    gel: number;
    gelT: number;
    dry: boolean;
    /** seconds since the striker last fired */
    cool: number;
    rof: number;
    heat: number;
    /** recoil spring */
    kick: number;
    kickV: number;
    mzT: number;
    bob: number;
    /** landing dip spring */
    dip: number;
    dipV: number;
    /** viewmodel sway */
    swx: number;
    swy: number;
    low: number;
    fovK: number;
    step: number;
    deadT: number;
    fired: number;
    sparked: number;
    /** debug: ignore damage */
    god: boolean;
    lmx: number;
    lmy: number;
}

export interface GameState {
    /** simulation clock, seconds */
    t: number;
    mode: Mode;
    /** camera shake 0..1 */
    trauma: number;
    hitStop: number;
    slowmo: number;
    flashFx: number;
    dmgFx: number;
    /** scorch stamps queued for the renderer: [x, z, radius, burn, heat] tuples */
    stamps: number[];
    sw: Shockwave[];
    stats: Stats;
    chain: number;
    chainT: number;
    /** how much fire is burning near the player, drives the crackle bed */
    fire: number;
    pl: Player;
}

export const PL: Player = {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, hp: 100, hurtT: 9, ground: true, coyote: 0, jbuf: 0, jheld: false,
    weapon: 0, next: 0, sw: 1, gel: 100, gelT: 9, dry: false, cool: 0, rof: 0, heat: 0, kick: 0, kickV: 0, mzT: 0, bob: 0, dip: 0, dipV: 0,
    swx: 0, swy: 0, low: 0, fovK: 0, step: 0, deadT: 0, fired: 0, sparked: 0, god: false, lmx: 0, lmy: 0,
};

/** Shared mutable game state. One game runs per page, so this is a module singleton. */
export const S: GameState = {
    t: 0,
    mode: 'title',
    trauma: 0,
    hitStop: 0,
    slowmo: 0,
    flashFx: 0,
    dmgFx: 0,
    stamps: [],
    sw: [],
    stats: { det: 0, best: 0, kills: 0, time: 0 },
    chain: 0,
    chainT: 0,
    fire: 0,
    pl: PL,
};
