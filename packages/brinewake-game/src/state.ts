import { NET } from './net/role';
import { type Sailor, TAVERN_SIZE, tavernful } from './ships/crew';
import { UPGRADES } from './ships/defs';
import { type Build, type Slot, STOCK } from './ships/fittings';
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
export interface Progress extends Build {
    /** gold banked at port: what the shipyard takes */
    gold: number;
    /** the hull in commission: 0 sloop, 1 brig, 2 galleon */
    cls: number;
    /** every hull owned, indexed like CLASSES */
    hulls: boolean[];
    /** level of each improvement, indexed like UPGRADES */
    levels: number[];
    /** the fitting in each slot, and the id of every fitting owned */
    fit: Record<Slot, string>;
    owned: string[];
    /** the company: everyone hired, with the station each holds (null: ashore) */
    crew: Sailor[];
    /** recruits at the tavern, changed for new faces each time she comes into port */
    tavern: Sailor[];
    /** the next sailor's id */
    nextId: number;
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
    /**
     * In the drydock: the shipyard as a mode of its own. `prog` is then a throwaway career with a
     * purse that buys everything, and nothing is saved.
     */
    drydock: boolean;
    prog: Progress;
}

/** Where the captain's feet are: on a deck of his ship, on land (or a wharf), in the sea, or on the gangway. */
export const ON = { DECK: 0, LAND: 1, SEA: 2, PLANK: 3 } as const;

/** The captain on his own two feet. Run by afoot.ts. */
export interface Walker {
    /** his feet, in the world, and the way he faces */
    x: number;
    y: number;
    z: number;
    yaw: number;
    /** which of ON he stands on, and while that is his ship's deck, where on it (in her own frame) and the heading she had */
    on: number;
    /** on his ship's deck, but under it: in the cabin below her quarterdeck, on its floor */
    below: boolean;
    /** which of her decks he is on: 0 her weather decks (and her cabin), 1 the first deck under them, and so on down */
    tier: number;
    /** the flight of her steps he is on, as its place in her hull's `flights`; -1 while he is on none */
    flight: number;
    lx: number;
    lz: number;
    heading: number;
    /** off the ground (jumping or falling) and how fast he is rising */
    air: boolean;
    vy: number;
    /** how fast he is going over the ground, m/s, and the way he is going: he gathers speed and loses it, he does not start and stop */
    speed: number;
    mx: number;
    mz: number;
    /** where in his stride (or his stroke) he is, radians */
    phase: number;
}

/** The player: the captain, his ship, and how they are looking at whichever they have charge of. */
export interface PlayerState {
    ship: Ship;
    /** true while the captain is on foot; false while he has the wheel, and the player sails the ship */
    afoot: boolean;
    me: Walker;
    /**
     * In a crew: the gun he is serving (-1 while he serves none), its battery (0 port, 1 starboard),
     * and how far off the beam he has trained it, radians.
     */
    gun: number;
    gunSide: number;
    train: number;
    /** she lies alongside the wharf with her gangway down, until someone at her wheel makes sail */
    berthed: boolean;
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
    /** 0..1: her sails loosed at anchor, so the yard can show her cloth and rig */
    dress: number;
    /** debug: ignore damage */
    god: boolean;
}

export const PL: PlayerState = {
    ship: null!,
    afoot: true,
    me: { x: 0, y: 0, z: 0, yaw: 0, on: ON.LAND, below: false, tier: 0, flight: -1, lx: 0, lz: 0, heading: 0, air: false, vy: 0, speed: 0, mx: 0, mz: 0, phase: 0 },
    gun: -1,
    gunSide: 0,
    train: 0,
    berthed: false,
    camYaw: 0, camPitch: -0.2, dist: 1, zoom: 0, side: -1, aimX: 0, aimZ: 0, canDock: false, fired: 0, dress: 0, god: false };

export const newProgress = (): Progress => ({
    gold: 0,
    cls: 0,
    hulls: [true, false, false],
    levels: UPGRADES.map(() => 0),
    fit: { ...STOCK },
    owned: [...new Set(Object.values(STOCK))],
    crew: [],
    tavern: tavernful(1, 0),
    nextId: 1 + TAVERN_SIZE,
    escorts: 0,
    renown: 0,
    won: false,
    stats: { sunk: 0, plunder: 0, time: 0 },
});

/**
 * True while the world is running under the player: in play, and in a crew behind the pause menu
 * too, since a sea shared with others does not stop because one of them has looked away.
 */
export const live = () => S.mode === 'play' || (NET.on && S.mode === 'pause');

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
    drydock: false,
    prog: newProgress(),
};
