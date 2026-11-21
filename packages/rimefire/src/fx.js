import { rnd, rnds, TAU, m4, m4trs } from './math.js';
import { height, W } from './world.js';

// shared mutable game state
export const S = {
    t: 0,
    mode: 'title',
    trauma: 0,
    hitStop: 0,
    slowmo: 0,
    flashFx: 0,
    stamps: [],
    sw: [],
    stats: { det: 0, best: 0, kills: 0, time: 0 },
    chain: 0,
    chainT: 0,
    fire: 0,
};

// ---- particles ----
export const MAXP = 4500;
const PS = 24,
    pd = new Float32Array(MAXP * PS);
let pn = 0;
const MAXS = 400,
    sp = new Float32Array(MAXS * 16);
let sn = 0;
export const gpu = new Float32Array((MAXP + MAXS) * 16);
export const pcount = { n: 0 };

export function spawn(kind, x, y, z, vx, vy, vz, life, s0, s1, r, g, b, r1, g1, b1, a, add, drag = 0, grav = 0, stretch = 0) {
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
export function sprite(kind, x, y, z, size, r, g, b, a, vx = 0, vy = 0, vz = 0, stretch = 0) {
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

export function updateParticles(dt) {
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

// ---- lights ----
const LP = [];
let ln = 0;
const flashes = [];
export const lightU = { pos: new Float32Array(64), col: new Float32Array(48), n: 0 };
export function light(x, y, z, r, g, b, rad) {
    const o = LP[ln] || (LP[ln] = {});
    ln++;
    o.x = x;
    o.y = y;
    o.z = z;
    o.r = r;
    o.g = g;
    o.b = b;
    o.rad = rad;
}
export function flash(x, y, z, r, g, b, rad, life) {
    if (flashes.length > 40) flashes.shift();
    flashes.push({ x, y, z, r, g, b, rad, life, max: life });
}
export function updateLights(dt, cx, cy, cz) {
    for (const l of W.lights) light(l.x, l.y, l.z, l.r, l.g, l.b, l.rad);
    for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        if ((f.life -= dt) <= 0) {
            flashes.splice(i, 1);
            continue;
        }
        const k = (f.life / f.max) ** 2;
        light(f.x, f.y, f.z, f.r * k, f.g * k, f.b * k, f.rad);
    }
    const n = ln;
    for (let i = 0; i < n; i++) {
        const o = LP[i],
            d2 = (o.x - cx) ** 2 + (o.y - cy) ** 2 + (o.z - cz) ** 2;
        o.s = ((o.r + o.g + o.b) * o.rad * o.rad) / (d2 + o.rad * o.rad * 0.5 + 4);
    }
    const A = LP.slice(0, n).sort((a, b) => b.s - a.s);
    const m = Math.min(16, n);
    for (let i = 0; i < m; i++) {
        const o = A[i];
        lightU.pos[i * 4] = o.x;
        lightU.pos[i * 4 + 1] = o.y;
        lightU.pos[i * 4 + 2] = o.z;
        lightU.pos[i * 4 + 3] = o.rad;
        lightU.col[i * 3] = o.r;
        lightU.col[i * 3 + 1] = o.g;
        lightU.col[i * 3 + 2] = o.b;
    }
    lightU.n = m;
    ln = 0;
}

// ---- debris (instanced rigid shards) ----
export const debris = [];
export function addDebris(mesh, x, y, z, vx, vy, vz, s, life, r = 1, g = 1, b = 1, emis = 1) {
    if (debris.length > 160) debris.shift();
    debris.push({ mesh, x, y, z, vx, vy, vz, a: rnd(TAU), b: rnd(TAU), c: rnd(TAU), wa: rnds(9), wb: rnds(9), wc: rnds(9), s, life, max: life, r, g, bl: b, emis });
}
const dm = m4();
export function updateDebris(dt, addInst) {
    for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        if ((d.life -= dt) <= 0) {
            debris.splice(i, 1);
            continue;
        }
        d.vy -= 16 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        const h = height(d.x, d.z) + d.s * 0.25;
        if (d.y < h) {
            d.y = h;
            d.vy *= -0.35;
            d.vx *= 0.55;
            d.vz *= 0.55;
            d.wa *= 0.5;
            d.wb *= 0.5;
            d.wc *= 0.5;
        }
        d.a += d.wa * dt;
        d.b += d.wb * dt;
        d.c += d.wc * dt;
        const s = d.s * Math.min(1, d.life / 0.5);
        m4trs(dm, d.x, d.y, d.z, d.a, d.b, d.c, s);
        addInst(d.mesh, dm, d.r, d.g, d.bl, 0, d.emis * Math.min(1, d.life / d.max + 0.2));
    }
}

// ---- screen feedback ----
export function shake(a) {
    S.trauma = Math.min(1, S.trauma + a);
}
export function shockwave(x, y, z, str) {
    if (S.sw.length >= 4) S.sw.shift();
    S.sw.push({ x, y, z, t: 0, str });
}

// ---- effect recipes ----
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
export function fxExplosion(x, y, z, s) {
    flash(x, y + 0.4, z, 55 * s, 25 * s, 7 * s, 8 + 5 * s, 0.3);
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
export function fxGooSplat(x, y, z, nx, ny, nz, n = 6) {
    for (let i = 0; i < n; i++) {
        const d = rdir(0);
        const vx = nx * 2.2 + d[0] * 2.4,
            vy = ny * 2.2 + d[1] * 2.4 + 1,
            vz = nz * 2.2 + d[2] * 2.4;
        spawn(5, x, y, z, vx, vy, vz, rnd(0.3, 0.6), rnd(0.04, 0.085), 0.02, 0.08, 1.3, 0.22, 0.03, 0.7, 0.1, 1, 0.6, 0.5, 13);
    }
}
export function fxSparks(x, y, z, nx, ny, nz, n = 8, hot = 1) {
    for (let i = 0; i < n; i++) {
        const d = rdir(0),
            v = rnd(3, 10);
        spawn(2, x, y, z, (nx * 0.8 + d[0]) * v, (ny * 0.8 + d[1]) * v + 1, (nz * 0.8 + d[2]) * v, rnd(0.2, 0.55), 0.022, 0.01, 14 * hot, 8 * hot, 3, 7, 1.5, 0.2, 1, 1, 1, 13, 0.028);
    }
    spawn(0, x, y, z, 0, 0, 0, 0.09, 0.3, 0.9, 12, 7, 3, 5, 1.5, 0.3, 0.9, 1);
}
export function fxIce(x, y, z, s, n = 10) {
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
export function fxFlame(x, y, z, s) {
    spawn(1, x + rnds(0.3) * s, y + rnd(0.3) * s, z + rnds(0.3) * s, rnds(0.4), rnd(1.2, 2.8), rnds(0.4), rnd(0.35, 0.7), 0.55 * s, 0.15 * s, 11, 5, 1, 2.2, 0.3, 0.02, 0.85, 1, 0.5, -2.5);
    if (Math.random() < 0.18) spawn(2, x + rnds(0.3) * s, y + 0.3, z + rnds(0.3) * s, rnds(1.2), rnd(2, 5), rnds(1.2), rnd(0.5, 1.2), 0.018, 0.008, 12, 6, 1.5, 5, 1, 0.1, 1, 1, 0.8, 2, 0.02);
    if (Math.random() < 0.1) spawn(3, x, y + 0.8 * s, z, rnds(0.3), rnd(1.5, 2.5), rnds(0.3), rnd(1.2, 2.2), 0.4 * s, 1.5 * s, 0.14, 0.1, 0.08, 0.03, 0.03, 0.04, 0.4, 0, 0.6, -0.3);
}
export function fxPuff(x, y, z, s, n = 4) {
    for (let i = 0; i < n; i++) {
        const d = rdir(0.6);
        spawn(3, x, y + 0.1, z, d[0] * 2 * s, rnd(0.3, 1.2), d[2] * 2 * s, rnd(0.4, 0.9), 0.25 * s, 1.1 * s, 0.75, 0.82, 0.95, 0.6, 0.66, 0.8, 0.28, 0, 2.5, 0.3);
    }
}
