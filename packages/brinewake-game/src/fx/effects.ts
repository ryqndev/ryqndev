import { rnd, rnds, TAU } from '@ryqndev/kiln-math';

import { stampFoam } from './foam';
import { flash } from './lights';
import { spawn } from './particles';

// the breeze smoke drifts on, m/s
const WIND_X = 2.6,
    WIND_Z = 1.4;

const dirv = [0, 0, 0];
// random unit vector; `up` > 0 biases it skyward
function rdir(up = 0) {
    const a = rnd(TAU),
        y = Math.min(1, rnd(up, 1) * 2 - 1 + up),
        r = Math.sqrt(Math.max(0, 1 - y * y));
    dirv[0] = Math.cos(a) * r;
    dirv[1] = y;
    dirv[2] = Math.sin(a) * r;
    return dirv;
}

/** A gun firing from a point, along the horizontal direction (dx, dz). */
export function fxMuzzle(x: number, y: number, z: number, dx: number, dz: number) {
    flash(x + dx * 2, y + 0.5, z + dz * 2, 60, 36, 12, 36, 0.14);
    spawn(0, x + dx, y, z + dz, 0, 0, 0, 0.09, 1.3, 3.2, 9, 5, 1.6, 4, 1.2, 0.2, 0.9, 1);
    for (let i = 0; i < 3; i++) {
        const v = 7 + i * 7;
        spawn(1, x + dx * (0.6 + i * 0.5), y, z + dz * (0.6 + i * 0.5), dx * v + rnds(1), rnds(1), dz * v + rnds(1), rnd(0.14, 0.24), 0.6, rnd(1.1, 1.6), 14, 7, 1.8, 2, 0.3, 0.02, 0.95, 1, 5, 0);
    }
    for (let i = 0; i < 4; i++) {
        const v = rnd(3, 10);
        spawn(3, x + dx * 1.2, y + 0.2, z + dz * 1.2, dx * v + WIND_X + rnds(1), rnd(0.3, 1.6), dz * v + WIND_Z + rnds(1), rnd(1.8, 3.4), 0.9, rnd(3, 5.2), 0.86, 0.85, 0.82, 0.62, 0.62, 0.62, 0.5, 0, 0.9, -0.15);
    }
    for (let i = 0; i < 5; i++) {
        const v = rnd(10, 28);
        spawn(2, x + dx, y, z + dz, dx * v + rnds(4), rnd(-1, 5), dz * v + rnds(4), rnd(0.2, 0.5), 0.05, 0.02, 12, 7, 2.5, 6, 1.2, 0.15, 1, 1, 1.2, 9, 0.035);
    }
}

/** A ball plunging into the sea at height y. */
export function fxSplash(x: number, y: number, z: number, s = 1) {
    for (let i = 0; i < 9; i++) spawn(5, x + rnds(0.4), y, z + rnds(0.4), rnds(2.6) * s, rnd(6, 13) * s, rnds(2.6) * s, rnd(0.7, 1.3), rnd(0.12, 0.26) * s, 0.05, 0.9, 0.95, 1, 0.8, 0.9, 1, 0.9, 0, 0.3, 16);
    for (let i = 0; i < 4; i++) spawn(3, x, y + 0.3, z, rnds(1.5), rnd(3, 7.5) * s, rnds(1.5), rnd(0.6, 1.1), 0.6 * s, rnd(1.8, 2.8) * s, 0.95, 0.97, 1, 0.85, 0.9, 0.95, 0.55, 0, 1.5, 6);
    spawn(4, x, y + 0.2, z, 0, 0, 0, 0.9, 0.6 * s, 4.6 * s, 0.9, 0.95, 1, 0.8, 0.9, 1, 0.5, 0);
    stampFoam(x, z, 2.4 * s, 0.7);
}

/** A ball striking a hull. */
export function fxHit(x: number, y: number, z: number) {
    flash(x, y + 0.5, z, 30, 16, 5, 20, 0.14);
    spawn(0, x, y, z, 0, 0, 0, 0.1, 0.8, 2.2, 10, 5, 1.5, 4, 1, 0.2, 0.9, 1);
    for (let i = 0; i < 9; i++) {
        const d = rdir(0.4),
            v = rnd(3, 9);
        spawn(5, x, y, z, d[0] * v, d[1] * v + 2, d[2] * v, rnd(0.5, 1), rnd(0.08, 0.2), 0.05, 0.5, 0.36, 0.22, 0.3, 0.2, 0.12, 1, 0, 0.4, 16);
    }
    for (let i = 0; i < 4; i++) {
        const d = rdir(0.3),
            v = rnd(5, 14);
        spawn(2, x, y, z, d[0] * v, d[1] * v + 2, d[2] * v, rnd(0.25, 0.6), 0.04, 0.015, 12, 7, 2.5, 6, 1.2, 0.15, 1, 1, 0.8, 12, 0.03);
    }
    for (let i = 0; i < 2; i++) spawn(3, x, y + 0.3, z, rnds(1.5) + WIND_X, rnd(0.8, 2), rnds(1.5) + WIND_Z, rnd(1, 1.8), 0.6, rnd(1.8, 2.6), 0.3, 0.27, 0.24, 0.16, 0.15, 0.15, 0.5, 0, 0.8, -0.3);
}

/** A ship's magazine going up as she is lost. */
export function fxExplosion(x: number, y: number, z: number, s: number) {
    flash(x, y + 2, z, 130, 75, 26, 60 + 20 * s, 0.6);
    spawn(0, x, y + 1, z, 0, 0, 0, 0.16, 3 * s, 9 * s, 8, 4.5, 1.6, 4, 1.2, 0.2, 0.9, 1);
    for (let i = 0; i < 14; i++) {
        const d = rdir(0.5),
            v = rnd(3, 11) * s;
        spawn(1, x + d[0] * s, y + 1 + d[1] * s, z + d[2] * s, d[0] * v, d[1] * v + 2, d[2] * v, rnd(0.5, 1.1), 1.4 * s, rnd(3, 4.6) * s, 13, 6.5, 1.6, 1.8, 0.25, 0.02, 0.95, 1, 1.8, -1.6);
    }
    for (let i = 0; i < 9; i++) {
        const d = rdir(0.5);
        spawn(3, x + d[0] * 2 * s, y + 2, z + d[2] * 2 * s, d[0] * 3 + WIND_X, rnd(2, 5.5), d[2] * 3 + WIND_Z, rnd(3, 5.5), 2 * s, rnd(5, 8) * s, 0.24, 0.2, 0.17, 0.08, 0.08, 0.09, 0.6, 0, 0.5, -0.3);
    }
    for (let i = 0; i < 18; i++) {
        const d = rdir(0.4),
            v = rnd(8, 26);
        spawn(2, x, y + 1, z, d[0] * v, d[1] * v + 4, d[2] * v, rnd(0.5, 1.3), 0.07, 0.025, 12, 7, 2.5, 6, 1.2, 0.15, 1, 1, 0.6, 14, 0.035);
    }
    spawn(4, x, 0.4, z, 0, 0, 0, 1.3, 2 * s, 16 * s, 0.9, 0.95, 1, 0.8, 0.9, 1, 0.5, 0);
    stampFoam(x, z, 9 * s, 0.9);
}

/** One frame's worth of fire on a burning deck; call it at a rate that matches how badly she burns. */
export function fxBurn(x: number, y: number, z: number, s: number) {
    spawn(1, x + rnds(0.5) * s, y + rnd(0.4) * s, z + rnds(0.5) * s, rnds(0.5), rnd(1.6, 3.4), rnds(0.5), rnd(0.4, 0.8), 0.9 * s, 0.25 * s, 11, 5, 1, 2.2, 0.3, 0.02, 0.85, 1, 0.5, -2.5);
    if (Math.random() < 0.5) spawn(3, x, y + 1.2 * s, z, rnds(0.4) + WIND_X, rnd(2, 3.6), rnds(0.4) + WIND_Z, rnd(2.4, 4.4), 0.8 * s, rnd(2.6, 4) * s, 0.16, 0.13, 0.11, 0.05, 0.05, 0.06, 0.55, 0, 0.25, -0.2);
    if (Math.random() < 0.2) spawn(2, x + rnds(0.5) * s, y + 0.5, z + rnds(0.5) * s, rnds(1.5), rnd(3, 7), rnds(1.5), rnd(0.6, 1.3), 0.035, 0.012, 12, 6, 1.5, 5, 1, 0.1, 1, 1, 0.8, 2, 0.025);
}

/** Spray thrown off a bow driving through the swell. */
export function fxSpray(x: number, y: number, z: number, vx: number, vz: number, s: number) {
    spawn(5, x, y, z, vx + rnds(1.5), rnd(2, 5.5) * s, vz + rnds(1.5), rnd(0.5, 0.9), rnd(0.08, 0.18), 0.04, 0.9, 0.95, 1, 0.8, 0.9, 1, 0.8, 0, 0.6, 14);
    if (Math.random() < 0.4) spawn(3, x, y + 0.2, z, vx * 0.5 + rnds(1), rnd(0.8, 2) * s, vz * 0.5 + rnds(1), rnd(0.5, 0.9), 0.5 * s, 1.7 * s, 0.95, 0.97, 1, 0.85, 0.9, 0.95, 0.35, 0, 1.6, 2);
}

/** A ball burying itself in a beach or hillside. */
export function fxDust(x: number, y: number, z: number) {
    for (let i = 0; i < 5; i++) {
        const d = rdir(0.6);
        spawn(3, x, y + 0.3, z, d[0] * 3, rnd(1.5, 4), d[2] * 3, rnd(0.8, 1.6), 0.6, rnd(2, 3.2), 0.6, 0.52, 0.38, 0.45, 0.4, 0.32, 0.5, 0, 1.6, 0.5);
    }
    for (let i = 0; i < 6; i++) {
        const d = rdir(0.6),
            v = rnd(3, 9);
        spawn(5, x, y + 0.2, z, d[0] * v, d[1] * v + 3, d[2] * v, rnd(0.5, 1), rnd(0.07, 0.16), 0.04, 0.5, 0.44, 0.32, 0.4, 0.34, 0.26, 1, 0, 0.4, 16);
    }
}

/** Air boiling up over a hull on its way down. */
export function fxFroth(x: number, z: number, r: number) {
    const fx = x + rnds(r),
        fz = z + rnds(r);
    stampFoam(fx, fz, rnd(2.5, 5), 0.5);
    spawn(3, fx, 0.3, fz, rnds(1), rnd(0.5, 2), rnds(1), rnd(0.6, 1.2), 0.7, rnd(1.8, 3), 0.95, 0.97, 1, 0.85, 0.9, 0.95, 0.4, 0, 1.5, 2);
}
