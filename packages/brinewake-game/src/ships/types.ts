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

/**
 * What a gun throws, which decides what its shot does where it lands: round shot holes a hull;
 * grape is a hail of small balls that clears a deck; chain tears down sail; a harpoon is a barbed
 * iron on a line, and holds what it strikes; a shell is lobbed high and bursts, and breaks stone.
 */
export const SHOT = { ROUND: 0, GRAPE: 1, CHAIN: 2, HARPOON: 3, SHELL: 4 } as const;

/**
 * How a battery is mounted, which decides how many guns it has, how they stand, and what is done to
 * the hull's side for them: long guns on carriages at ports, swivels on the rail, harpoon guns,
 * mortars bedded inboard, or one great gun on a platform where three ports were. The mounts
 * themselves, by these numbers, are in hull/mounts.ts.
 */
export const MOUNT = { CARRIAGE: 0, SWIVEL: 1, HARPOON: 2, MORTAR: 3, GREAT: 4 } as const;

/** What the guns of one battery do. */
export interface GunStats {
    /** which of SHOT it throws, and how many to a gun */
    kind: number;
    pellets: number;
    /** hull damage per ball */
    dmg: number;
    /** what each ball does to the hands on a deck and to the sails over it, in the same measure as hull damage */
    crew: number;
    rig: number;
    /** seconds between broadsides */
    reload: number;
    /** muzzle speed, m/s: it sets the range */
    shot: number;
    /** aiming error as a fraction of the range */
    spread: number;
    /** how big the gun sounds: 1 is a six-pounder */
    heft: number;
    /** how much of its hull damage stone takes: what it does to a fort */
    stone: number;
    /** which of MOUNT it is mounted as */
    mount: number;
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
    /** how much wider than the gun's own scatter the broadside under way is thrown: 1 unless it is fired by hired hands left to themselves */
    wild: number;
    /** seconds until each gun can be fired again by a player serving it; a gun with no entry is loaded */
    load: number[];
}

export interface Ship {
    /** what she is known by between the browsers of a crew: hers for as long as she is afloat */
    id: number;
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
    /** hands fit to fight, 1 a full company .. 0 none: fewer serve the guns slower, and with none left she strikes */
    crew: number;
    /** how much of her sail still draws, 1 whole .. 0 in ribbons; it is knotted and spliced back in time */
    rig: number;
    /** she has hauled down her colours: she lies to, and is a prize for whoever comes alongside */
    struck: boolean;
    /** seconds a harpoon line still holds her, and the ship at the other end of it */
    snare: number;
    holder: Ship | null;
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
    /** in a crew, anywhere but the host: where the host last said she was, carried on from there. She is eased toward it */
    gx: number;
    gz: number;
    gyaw: number;
}
