import { rnd, rnds, TAU } from '@ryqndev/kiln-math';

import { S } from '../state';
import { height } from '../world';
import { shockwave } from './feedback';
import { flash } from './lights';
import { spawn } from './particles';

const dirv = [0, 0, 0];
function rdir(up = 0) {
    const a = rnd(TAU),
        y = rnd(up, 1) * 2 - 1 + up,
        r = Math.sqrt(Math.max(0, 1 - Math.min(1, y * y)));
    dirv[0] = Math.cos(a) * r;
    dirv[1] = Math.min(1, y);
    dirv[2] = Math.sin(a) * r;
    return dirv;
}
export function fxExplosion(x: number, y: number, z: number, s: number) {
    flash(x, y + 0.4, z, 55 * s, 25 * s, 7 * s, 8 + 5 * s, 0.3, true);
    spawn(0, x, y + 0.2, z, 0, 0, 0, 0.11, 0.9 * s, 2.6 * s, 7, 4, 1.6, 4, 1.2, 0.2, 0.9, 1);
    const nf = 7 + ((3 * s) | 0);
    for (let i = 0; i < nf; i++) {
        const d = rdir(0.5),
            v = rnd(1.5, 6) * s;
        spawn(1, x + d[0] * 0.25, y + 0.25 + d[1] * 0.25, z + d[2] * 0.25, d[0] * v, d[1] * v + 1.2, d[2] * v, rnd(0.35, 0.75), 0.45 * s, rnd(1.2, 1.9) * s, 13, 6.5, 1.6, 1.8, 0.25, 0.02, 0.95, 1, 2.4, -1.6);
    }
    for (let i = 0; i < 4; i++) {
        const d = rdir(0.5);
        spawn(3, x + d[0] * 0.3, y + 0.5, z + d[2] * 0.3, d[0] * 1.6, rnd(1.2, 3), d[2] * 1.6, rnd(1.4, 2.8), 0.7 * s, rnd(2.2, 3.2) * s, 0.5, 0.3, 0.16, 0.04, 0.045, 0.055, 0.5, 0, 1.1, -0.4);
    }
    for (let i = 0; i < 10; i++) {
        const d = rdir(0.4),
            v = rnd(5, 15);
        spawn(2, x, y + 0.2, z, d[0] * v, d[1] * v + 2, d[2] * v, rnd(0.45, 1.1), 0.03, 0.012, 12, 7, 2.5, 6, 1.2, 0.15, 1, 1, 0.7, 15, 0.03);
    }
    const gy = height(x, z);
    if (y - gy < 1.6) {
        spawn(4, x, gy + 0.08, z, 0, 0, 0, 0.42, 0.5 * s, 5.5 * s, 5, 3, 1.4, 1.5, 0.4, 0.06, 0.7, 1);
        S.stamps.push(x, z, 1.5 + 1.1 * s, 0.75, 0.9);
        for (let i = 0; i < 5; i++) {
            const d = rdir(0.6);
            spawn(3, x + d[0] * s, gy + 0.2, z + d[2] * s, d[0] * 4 * s, rnd(0.6, 2.2), d[2] * 4 * s, rnd(0.6, 1.3), 0.5, 1.8, 0.75, 0.82, 0.95, 0.6, 0.66, 0.8, 0.3, 0, 2.5, 0.4);
        }
    }
    shockwave(x, y + 0.3, z, 0.6 + 0.4 * s);
}
export function fxGooSplat(x: number, y: number, z: number, nx: number, ny: number, nz: number, n = 6) {
    for (let i = 0; i < n; i++) {
        const d = rdir(0);
        const vx = nx * 2.2 + d[0] * 2.4,
            vy = ny * 2.2 + d[1] * 2.4 + 1,
            vz = nz * 2.2 + d[2] * 2.4;
        spawn(5, x, y, z, vx, vy, vz, rnd(0.3, 0.6), rnd(0.04, 0.085), 0.02, 0.08, 1.3, 0.22, 0.03, 0.7, 0.1, 1, 0.6, 0.5, 13);
    }
}
export function fxSparks(x: number, y: number, z: number, nx: number, ny: number, nz: number, n = 8, hot = 1) {
    for (let i = 0; i < n; i++) {
        const d = rdir(0),
            v = rnd(3, 10);
        spawn(2, x, y, z, (nx * 0.8 + d[0]) * v, (ny * 0.8 + d[1]) * v + 1, (nz * 0.8 + d[2]) * v, rnd(0.2, 0.55), 0.022, 0.01, 14 * hot, 8 * hot, 3, 7, 1.5, 0.2, 1, 1, 1, 13, 0.028);
    }
    spawn(0, x, y, z, 0, 0, 0, 0.09, 0.3, 0.9, 12, 7, 3, 5, 1.5, 0.3, 0.9, 1);
}
export function fxIce(x: number, y: number, z: number, s: number, n = 10) {
    for (let i = 0; i < n; i++) {
        const d = rdir(0.3),
            v = rnd(2, 8) * s;
        spawn(5, x + d[0] * 0.2 * s, y + d[1] * 0.2 * s, z + d[2] * 0.2 * s, d[0] * v, d[1] * v + 2, d[2] * v, rnd(0.5, 1.1), rnd(0.03, 0.09) * s, 0.02, 1.6, 2.6, 3.4, 0.4, 0.9, 1.6, 0.95, 0.7, 0.4, 12);
    }
    for (let i = 0; i < 3; i++) {
        const d = rdir(0.3);
        spawn(3, x, y, z, d[0] * 1.5 * s, d[1] * 1.5 + 0.5, d[2] * 1.5 * s, rnd(0.6, 1.2), 0.4 * s, 1.6 * s, 0.7, 0.85, 1, 0.5, 0.65, 0.9, 0.35, 0.2, 2, 0);
    }
}
export function fxFlame(x: number, y: number, z: number, s: number) {
    spawn(1, x + rnds(0.3) * s, y + rnd(0.3) * s, z + rnds(0.3) * s, rnds(0.4), rnd(1.2, 2.8), rnds(0.4), rnd(0.35, 0.7), 0.55 * s, 0.15 * s, 11, 5, 1, 2.2, 0.3, 0.02, 0.85, 1, 0.5, -2.5);
    if (Math.random() < 0.18) spawn(2, x + rnds(0.3) * s, y + 0.3, z + rnds(0.3) * s, rnds(1.2), rnd(2, 5), rnds(1.2), rnd(0.5, 1.2), 0.018, 0.008, 12, 6, 1.5, 5, 1, 0.1, 1, 1, 0.8, 2, 0.02);
    if (Math.random() < 0.1) spawn(3, x, y + 0.8 * s, z, rnds(0.3), rnd(1.5, 2.5), rnds(0.3), rnd(1.2, 2.2), 0.4 * s, 1.5 * s, 0.14, 0.1, 0.08, 0.03, 0.03, 0.04, 0.4, 0, 0.6, -0.3);
}
export function fxPuff(x: number, y: number, z: number, s: number, n = 4) {
    for (let i = 0; i < n; i++) {
        const d = rdir(0.6);
        spawn(3, x, y + 0.1, z, d[0] * 2 * s, rnd(0.3, 1.2), d[2] * 2 * s, rnd(0.4, 0.9), 0.25 * s, 1.1 * s, 0.75, 0.82, 0.95, 0.6, 0.66, 0.8, 0.28, 0, 2.5, 0.3);
    }
}
