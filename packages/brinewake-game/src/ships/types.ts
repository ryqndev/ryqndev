import type { Mesh } from '@ryqndev/brinewake-renderer';

import type { HullModel } from '../models';

/** Whose side a ship is on. Shot never harms its own side. */
export const TEAM = { PIRATE: 0, NAVY: 1, TRADE: 2 } as const;

/** What a ship is doing in the world; decides how its AI thinks. */
export type Role = 'player' | 'escort' | 'trader' | 'patrol' | 'hunter' | 'flagship';

/** AI behaviour state. */
export const AI = { CRUISE: 0, ENGAGE: 1, FLEE: 2, FOLLOW: 3 } as const;

/** Stats a ship is built from. */
export interface ShipType {
    name: string;
    /** index into HULLS, and a size multiplier on it */
    hull: number;
    scale: number;
    hp: number;
    /** top speed, m/s, and turn rate at speed, rad/s */
    speed: number;
    turn: number;
    /** damage per ball, seconds between broadsides, muzzle speed m/s */
    dmg: number;
    reload: number;
    shot: number;
    /** aiming error as a fraction of the range */
    spread: number;
    /** gold left floating when sunk, and renown earned for sinking it */
    loot: number;
    renown: number;
    /** wale colour and sail colour */
    paint: number[];
    canvas: number[];
}

/** What the guns of one battery do. */
export interface GunStats {
    /** damage per ball */
    dmg: number;
    /** seconds between broadsides */
    reload: number;
    /** muzzle speed, m/s: it sets the range */
    shot: number;
    /** aiming error as a fraction of the range */
    spread: number;
    /** how big the gun sounds: 1 is a six-pounder */
    heft: number;
}

/**
 * One side's guns: what they are, their reload, and any broadside under way. The guns of a broadside go off
 * together, each a ragged instant apart. Owned by battery.ts: go through it, not the fields.
 */
export interface Battery {
    gun: GunStats;
    /** seconds of reloading left; 0 when ready */
    left: number;
    /** seconds since the order to fire; negative when no broadside is under way */
    t: number;
    /** when each gun goes off, seconds after the order; negative once it has fired */
    at: number[];
    /** the point on the sea it was laid on */
    tx: number;
    tz: number;
}

export interface Ship {
    role: Role;
    team: number;
    type: ShipType;
    hull: HullModel;
    scale: number;
    x: number;
    z: number;
    yaw: number;
    /** speed through the water, and rate of turn */
    v: number;
    w: number;
    /** attitude on the swell */
    y: number;
    pitch: number;
    roll: number;
    /** canvas ordered, 0 (furled) .. 3 (full), and the fraction actually set */
    sail: number;
    canvas: number;
    /** helm, -1 (hard to starboard) .. 1 (hard to port) */
    rudder: number;
    hp: number;
    max: number;
    speed: number;
    turn: number;
    /** hull her carpenter mends each second while she is afloat; 0 without one */
    mend: number;
    /** the colours she wears, in linear light: wale and flag, and sailcloth */
    paint: number[];
    cloth: number[];
    /** the device on her square sails, as the mesh to draw over each (null: none), and the colour it is painted */
    sigil: Mesh | null;
    ink: number[];
    /** her batteries, port then starboard */
    bat: [Battery, Battery];
    /** hit glow, fading */
    flash: number;
    /** seconds since she started to go down; 0 while afloat */
    sink: number;
    dead: boolean;
    /** half-length, half-beam and bounding radius squared, scaled */
    hl: number;
    hb: number;
    br2: number;
    loot: number;
    // ---- AI ----
    st: number;
    /** seconds until it next reconsiders */
    think: number;
    tgt: Ship | null;
    /** route waypoint it is making for */
    wp: number;
    /** heading and canvas the helmsman is steering for */
    goal: number;
    want: number;
    /** which way round it circles a target: 1 keeps the target to port */
    orbit: number;
    /** seconds left of remembering who fired on it */
    aggro: number;
    /** escort: place in the formation */
    slot: number;
    seed: number;
    /** metres sailed since the last foam stamp */
    wake: number;
    /** seconds aground, to space out the damage */
    ground: number;
}
