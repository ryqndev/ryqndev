import { WORLD } from '@ryqndev/brinewake-renderer';
import { fbm, rng, smooth, TAU } from '@ryqndev/rimefire-math';

export interface Island {
    x: number;
    z: number;
    /** mean radius of the shoreline */
    r: number;
    /** roughly how high its hills rise */
    peak: number;
    seed: number;
}

/** Radius of the sea that ships are kept inside. */
export const SEA = WORLD * 0.87;
/** Depth of the open-sea floor, and the height returned anywhere outside the charted square. */
const FLOOR = -32;

/** The archipelago. Index 0 is the home island, which carries the port. */
export const ISLANDS: Island[] = [{ x: 0, z: 0, r: 118, peak: 30, seed: 3.1 }];
{
    const R = rng(1717);
    for (let tries = 0; ISLANDS.length < 10 && tries < 600; tries++) {
        const a = R() * TAU,
            d = 250 + R() * 290,
            r = 52 + R() * 70,
            x = Math.cos(a) * d,
            z = Math.sin(a) * d;
        // leave channels wide enough to fight in between neighbours, and open water inside the rim
        if (d + r < SEA - 40 && ISLANDS.every((o) => Math.hypot(x - o.x, z - o.z) > r + o.r + 120)) ISLANDS.push({ x, z, r, peak: 12 + R() * 28, seed: R() * 50 });
    }
}

function rawHeight(x: number, z: number) {
    let h = FLOOR;
    for (const o of ISLANDS) {
        const d = Math.hypot(x - o.x, z - o.z);
        if (d > o.r * 2.8) continue;
        // the coastline wanders in and out of the island's mean radius
        const e = 1 - d / (o.r * (0.7 + 0.6 * fbm(x * 0.011 + o.seed, z * 0.011 - o.seed, 3)));
        // above the shoreline: a beach, then hills whose height the noise spreads unevenly, so
        // each island gets ridges and saddles rather than one cone; below it: the bed shelving away
        const lump = fbm(x * 0.019 + o.seed * 2, z * 0.019, 4);
        const hi = e > 0 ? e * 10 + smooth(0.05, 0.75, e) * o.peak * (0.15 + 2.1 * lump * lump) : e * 30;
        if (hi > h) h = hi;
    }
    return h;
}

/** Samples per side of the cached heightfield, which is also the texture the renderer shoals the sea with. */
export const HN = 512;
/** Metres between neighbouring samples. */
export const CELL = (2 * WORLD) / HN;
/** Terrain heights over the WORLD square, sampled at cell centres in rows of increasing z. */
export const hmap = new Float32Array(HN * HN);

/** World coordinate of sample `i` along either axis. */
export const sampleAt = (i: number) => (i + 0.5) * CELL - WORLD;

/** Terrain height in metres; negative is the depth of the sea bed. Sea level is 0. */
export function height(x: number, z: number) {
    const u = (x + WORLD) / CELL - 0.5,
        v = (z + WORLD) / CELL - 0.5;
    if (u < 0 || v < 0 || u >= HN - 1 || v >= HN - 1) return FLOOR;
    const i = u | 0,
        j = v | 0,
        fu = u - i,
        fv = v - j,
        o = j * HN + i;
    const a = hmap[o],
        b = hmap[o + 1],
        c = hmap[o + HN],
        d = hmap[o + HN + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
}

/** True when everything within `r` metres of a point is water at least `depth` deep. */
export function openWater(x: number, z: number, r: number, depth = 6) {
    if (Math.hypot(x, z) > SEA - r) return false;
    if (height(x, z) > -depth) return false;
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        if (height(x + Math.cos(a) * r, z + Math.sin(a) * r) > -depth) return false;
    }
    return true;
}

/** Fills the heightfield cache. Must run before anything queries height(). */
export function bakeHeightmap() {
    for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) hmap[j * HN + i] = rawHeight(sampleAt(i), sampleAt(j));
}
