import { rnds, TAU } from '@ryqndev/rimefire-math';
import { PARTICLE_CAPACITY, PARTICLE_STRIDE } from '@ryqndev/rimefire-renderer';

import { height } from '../world';

const MAXS = 400;
export const MAXP = PARTICLE_CAPACITY - MAXS;
const PS = 24,
    pd = new Float32Array(MAXP * PS);
let pn = 0;
const sp = new Float32Array(MAXS * PARTICLE_STRIDE);
let sn = 0;
/** Packed instance data handed to the renderer each frame. */
export const gpu = new Float32Array(PARTICLE_CAPACITY * PARTICLE_STRIDE);
export const pcount = { n: 0 };

/**
 * Spawns a simulated particle.
 * kind: 0 soft glow, 1 flame, 2 velocity-aligned spark, 3 smoke, 4 ground ring, 5 shard.
 * Colour fades r,g,b -> r1,g1,b1 and size s0 -> s1 over its life. add = 1 is additive, 0 alpha-blended.
 */
export function spawn(
    kind: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, s0: number, s1: number,
    r: number, g: number, b: number, r1: number, g1: number, b1: number, a: number, add: number, drag = 0, grav = 0, stretch = 0
) {
    const o = (pn >= MAXP ? (Math.random() * MAXP) | 0 : pn++) * PS;
    pd[o] = x;
    pd[o + 1] = y;
    pd[o + 2] = z;
    pd[o + 3] = vx;
    pd[o + 4] = vy;
    pd[o + 5] = vz;
    pd[o + 6] = pd[o + 7] = life;
    pd[o + 8] = s0;
    pd[o + 9] = s1;
    pd[o + 10] = r;
    pd[o + 11] = g;
    pd[o + 12] = b;
    pd[o + 13] = r1;
    pd[o + 14] = g1;
    pd[o + 15] = b1;
    pd[o + 16] = a;
    pd[o + 17] = add;
    pd[o + 18] = drag;
    pd[o + 19] = grav;
    pd[o + 20] = Math.random() * TAU;
    pd[o + 21] = rnds(1.5);
    pd[o + 22] = kind;
    pd[o + 23] = stretch;
}
// one-frame sprite (glows, tracers)
export function sprite(kind: number, x: number, y: number, z: number, size: number, r: number, g: number, b: number, a: number, vx = 0, vy = 0, vz = 0, stretch = 0) {
    if (sn >= MAXS) return;
    const o = sn++ * 16;
    sp[o] = x;
    sp[o + 1] = y;
    sp[o + 2] = z;
    sp[o + 3] = size;
    sp[o + 4] = r;
    sp[o + 5] = g;
    sp[o + 6] = b;
    sp[o + 7] = a;
    sp[o + 8] = 0;
    sp[o + 9] = kind;
    sp[o + 10] = 1;
    sp[o + 11] = 0;
    sp[o + 12] = vx;
    sp[o + 13] = vy;
    sp[o + 14] = vz;
    sp[o + 15] = stretch;
}

export function updateParticles(dt: number) {
    for (let i = pn - 1; i >= 0; i--) {
        const o = i * PS;
        if ((pd[o + 6] -= dt) <= 0) {
            pn--;
            if (i !== pn) pd.copyWithin(o, pn * PS, pn * PS + PS);
            continue;
        }
        const dr = Math.max(0, 1 - pd[o + 18] * dt);
        pd[o + 3] *= dr;
        pd[o + 4] = pd[o + 4] * dr - pd[o + 19] * dt;
        pd[o + 5] *= dr;
        pd[o] += pd[o + 3] * dt;
        pd[o + 1] += pd[o + 4] * dt;
        pd[o + 2] += pd[o + 5] * dt;
        pd[o + 20] += pd[o + 21] * dt;
        if (pd[o + 19] > 3 && pd[o + 4] < 0) {
            const h = height(pd[o], pd[o + 2]) + 0.03;
            if (pd[o + 1] < h) {
                pd[o + 1] = h;
                pd[o + 4] *= -0.35;
                pd[o + 3] *= 0.6;
                pd[o + 5] *= 0.6;
            }
        }
    }
    let n = 0;
    for (let pass = 0; pass < 2; pass++)
        for (let i = 0; i < pn; i++) {
            const o = i * PS;
            if (pd[o + 17] > 0.5 !== (pass === 1)) continue;
            const q = n++ * 16,
                age = 1 - pd[o + 6] / pd[o + 7],
                kind = pd[o + 22];
            const e = 1 - (1 - age) * (1 - age);
            gpu[q] = pd[o];
            gpu[q + 1] = pd[o + 1];
            gpu[q + 2] = pd[o + 2];
            gpu[q + 3] = pd[o + 8] + (pd[o + 9] - pd[o + 8]) * e;
            gpu[q + 4] = pd[o + 10] + (pd[o + 13] - pd[o + 10]) * age;
            gpu[q + 5] = pd[o + 11] + (pd[o + 14] - pd[o + 11]) * age;
            gpu[q + 6] = pd[o + 12] + (pd[o + 15] - pd[o + 12]) * age;
            let a = pd[o + 16] * (1 - age);
            if (kind === 3) a *= Math.min(1, age * 7);
            else if (kind === 1) a *= Math.min(1, age * 14) * (1 - age);
            gpu[q + 7] = a;
            gpu[q + 8] = pd[o + 20];
            gpu[q + 9] = kind;
            gpu[q + 10] = pd[o + 17];
            gpu[q + 11] = age;
            gpu[q + 12] = pd[o + 3];
            gpu[q + 13] = pd[o + 4];
            gpu[q + 14] = pd[o + 5];
            gpu[q + 15] = pd[o + 23];
        }
    gpu.set(sp.subarray(0, sn * 16), n * 16);
    pcount.n = n + sn;
    sn = 0;
}
export function clearParticles() {
    pn = 0;
    sn = 0;
}
