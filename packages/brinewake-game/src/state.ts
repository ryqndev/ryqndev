import type { Ship } from './ships/types';

export type Mode ='title' | 'play' | 'pause' | 'port' | 'dead' | 'win';

/** Lifetime tallies, kept with the save. */
export interface Stats {
    /** ships sent to the bottom */
    sunk: number;
    /** gold banked at port */
    plunder: number;
    /** seconds under sail */
    time: number;
}

/** Everything that survives between sessions. */
export interface Progress {
    /** gold banked at port: what the shipyard takes */
    gold: number;
    /** hull owned: 0 sloop, 1 brig, 2 galleon */
    cls: number;
    /** level of each upgrade, indexed like UPGRADES */
    levels: number[];
    escorts: number;
    /** notoriety: grows with every ship sunk and decides who comes hunting */
    renown: number;
    /** the admiral has been sunk */
    won: boolean;
    stats: Stats;
}

export interface GameState {
    /** simulation clock, seconds: also the clock the swell runs on */
    t: number;
    /** time of day: 0 sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight */
    day: number;
    mode: Mode;
    /** camera shake 0..1 */
    trauma: number;
    flashFx: number;
    dmgFx: number;
    /** plunder aboard: banked on docking, lost with the ship */
    hold: number;
    /** how much is burning near the camera, drives the crackle bed */
    fire: number;
    /** seconds since the player's ship was lost */
    deadT: number;
    prog: Progress;
}

/** The player's ship and how they are looking at it. */
export interface PlayerState {
    ship: Ship;
    /** orbit camera: heading and pitch of the line of sight, and a zoom factor on its distance */
    camYaw: number;
    camPitch: number;
    dist: number;
    /** 0..1 spyglass */
    zoom: number;
    /** the battery the line of sight is laying: 0 port, 1 starboard, -1 when neither bears */
    side: number;
    /** the point on the sea the guns are laid on */
    aimX: number;
    aimZ: number;
    /** close enough to the pier, and slow enough, to drop anchor */
    canDock: boolean;
    /** broadsides fired this session, for the tutorial hints */
    fired: number;
    /** debug: ignore damage */
    god: boolean;
}

export const PL: PlayerState = { ship: null!, camYaw: 0, camPitch: -0.2, dist: 1, zoom: 0, side: -1, aimX: 0, aimZ: 0, canDock: false, fired: 0, god: false };

export const newProgress = (): Progress => ({ gold: 0, cls: 0, levels: [0, 0, 0, 0, 0, 0], escorts: 0, renown: 0, won: false, stats: { sunk: 0, plunder: 0, time: 0 } });

/** Shared mutable game state. One game runs per page, so this is a module singleton. */
export const S: GameState = {
    t: 0,
    day: 0.07,
    mode: 'title',
    trauma: 0,
    flashFx: 0,
    dmgFx: 0,
    hold: 0,
    fire: 0,
    deadT: 0,
    prog: newProgress(),
};
