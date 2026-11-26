// A battery is one side's guns. This module owns when they fire: the reload, and the ragged
// instant each gun goes off within a broadside. Where the shot goes is cannons.ts.
import { rnd } from '@ryqndev/kiln-math';

import type { Battery, GunStats, Ship, ShipType } from './types';

/**
 * Seconds a broadside is spread over: no two gun crews pull their lanyards at quite the same instant.
 * Every gun draws its own delay from this, whatever it is and however fast it reloads.
 */
const SCATTER = 0.12;

/** The gun a type of ship is built with. */
export const gunOf = (t: ShipType): GunStats => ({ dmg: t.dmg, reload: t.reload, shot: t.shot, spread: t.spread, heft: 1 });

/** A battery of one sort of gun, loaded and with nothing under way. */
export const newBattery = (gun: GunStats): Battery => ({ gun, left: 0, t: -1, at: [], tx: 0, tz: 0 });

/** Orders a broadside from one battery onto a point on the sea. False if that side is still reloading. */
export function fireBroadside(s: Ship, side: number, tx: number, tz: number): boolean {
    const b = s.bat[side];
    if (s.dead || b.left > 0 || b.t >= 0) return false;
    b.t = 0;
    for (let i = 0; i < s.hull.guns; i++) b.at[i] = rnd(SCATTER);
    b.tx = tx;
    b.tz = tz;
    b.left = b.gun.reload;
    return true;
}

/** True when that side's guns are loaded. */
export const gunsReady = (s: Ship, side: number) => s.bat[side].left <= 0;

/** How far through its reload a battery is: 0 just fired, 1 ready. */
export const reloadProgress = (s: Ship, side: number) => 1 - s.bat[side].left / s.bat[side].gun.reload;

/** Loads both batteries on the spot. */
export function reloadGuns(s: Ship) {
    s.bat[0].left = s.bat[1].left = 0;
}

/** Calls off any broadside under way: guns that have not fired yet stay silent. */
export function ceaseFire(s: Ship) {
    s.bat[0].t = s.bat[1].t = -1;
}

/** Runs a battery's reload and its broadside clock. Ask gunFires() about every gun after each call. */
export function tickBattery(b: Battery, dt: number) {
    if (b.left > 0) b.left = Math.max(0, b.left - dt);
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
