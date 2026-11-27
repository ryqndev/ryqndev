// A battery is one side's guns. This module owns when they fire: the reload, and the ragged
// instant each gun goes off within a broadside. Where the shot goes is cannons.ts.
import { rnd } from '@ryqndev/kiln-math';

import { type Battery, type GunStats, MOUNT, type Ship, type ShipType, SHOT } from './types';

/**
 * Seconds a broadside is spread over: no two gun crews pull their lanyards at quite the same instant.
 * Every gun draws its own delay from this, whatever it is and however fast it reloads.
 */
const SCATTER = 0.12;

/** How much of a plain ball's damage stone takes. */
export const STONE = 0.2;

/** The gun a type of ship is built with. */
export const gunOf = (t: ShipType): GunStats => ({ kind: SHOT.ROUND, pellets: 1, dmg: t.dmg, crew: 0, rig: 0, reload: t.reload, shot: t.shot, spread: t.spread, heft: 1, stone: STONE, mount: MOUNT.CARRIAGE });

/** A battery of one sort of gun, loaded and with nothing under way. */
export const newBattery = (gun: GunStats): Battery => ({ gun, left: 0, t: -1, at: [], tx: 0, tz: 0, wild: 1, load: [] });

/**
 * Orders a broadside from one battery onto a point on the sea. False if that side is still reloading.
 * `spare` names guns that stay out of it (a player has them); `slow` and `wild` are how much longer
 * the reload is and how much wider the shot falls than the guns' own figures, for hands left to themselves.
 */
export function fireBroadside(s: Ship, side: number, tx: number, tz: number, spare?: (i: number) => boolean, slow = 1, wild = 1): boolean {
    const b = s.bat[side];
    if (s.dead || s.struck || b.left > 0 || b.t >= 0) return false;
    b.t = 0;
    // a short-handed ship is slow to serve her guns
    b.left = b.gun.reload * (2 - s.crew) * slow;
    for (let i = 0; i < s.hull.guns[side]; i++) {
        // a gun a player has, or has only just fired, is no part of it
        const out = spare?.(i) || b.load[i] > 0;
        b.at[i] = out ? -1 : rnd(SCATTER);
        if (!out) b.load[i] = b.left;
    }
    b.tx = tx;
    b.tz = tz;
    b.wild = wild;
    return true;
}

/** True when gun `i` of a battery is loaded for a player serving it, and no broadside is about to fire it. */
export const gunLoaded = (b: Battery, i: number) => !(b.load[i] > 0) && !(b.t >= 0 && b.at[i] >= 0);

/** How far through its reload gun `i` is for a player serving it: 0 just fired, 1 ready. */
export const gunProgress = (b: Battery, i: number) => 1 - Math.min(1, (b.load[i] || 0) / b.gun.reload);

/** A player has fired gun `i`: it is `reload` seconds before it is loaded again. */
export function spendGun(s: Ship, side: number, i: number) {
    const b = s.bat[side];
    b.load[i] = b.gun.reload * (2 - s.crew);
}

/** True when that side's guns are loaded. */
export const gunsReady = (s: Ship, side: number) => s.bat[side].left <= 0;

/** How far through its reload a battery is: 0 just fired, 1 ready. */
export const reloadProgress = (s: Ship, side: number) => 1 - s.bat[side].left / s.bat[side].gun.reload;

/** Loads both batteries on the spot. */
export function reloadGuns(s: Ship) {
    s.bat[0].left = s.bat[1].left = 0;
    s.bat[0].load.length = s.bat[1].load.length = 0;
}

/** Calls off any broadside under way: guns that have not fired yet stay silent. */
export function ceaseFire(s: Ship) {
    s.bat[0].t = s.bat[1].t = -1;
}

/** Runs a battery's reload and its broadside clock. Ask gunFires() about every gun after each call. */
export function tickBattery(b: Battery, dt: number) {
    if (b.left > 0) b.left = Math.max(0, b.left - dt);
    for (let i = 0; i < b.load.length; i++) if (b.load[i] > 0) b.load[i] = Math.max(0, b.load[i] - dt);
    if (b.t < 0) return;
    // every gun's moment falls inside SCATTER, so a clock already past it has fired them all
    if (b.t >= SCATTER) b.t = -1;
    else b.t += dt;
}

/** Whether gun `i` goes off now. True once per gun per broadside. */
export function gunFires(b: Battery, i: number): boolean {
    if (b.t < 0 || !(b.at[i] >= 0) || b.at[i] > b.t) return false;
    b.at[i] = -1;
    return true;
}
