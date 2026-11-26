import { fbm, PI, smooth, TAU } from '@ryqndev/kiln-math';

/** Height above its base of the light a reignited pylon gives off. */
export const PYLON_LIGHT_HEIGHT = 5.2;
export const ARENA = 56;
export const STEP = 0.5;
export const PYL = [0, 1, 2].map((k) => {
    const a = PI / 2 + (k * TAU) / 3;
    return [Math.cos(a) * 36, Math.sin(a) * 36];
});

function rawHeight(x: number, z: number) {
    const r = Math.hypot(x, z);
    let h = (fbm(x * 0.045 + 7.3, z * 0.045 + 1.7, 3) - 0.5) * 2.4 + (fbm(x * 0.17, z * 0.17, 2) - 0.5) * 0.3;
    let f = smooth(10, 22, r);
    for (const p of PYL) f = Math.min(f, smooth(5, 11, Math.hypot(x - p[0], z - p[1])));
    h *= f;
    const m = smooth(55, 120, r);
    h += smooth(50, 66, r) * 2.5 + m * m * (30 + (fbm(x * 0.021 + 3, z * 0.021 + 9, 4) - 0.35) * 95);
    return h;
}
// cached heightfield for the playable area
const HN = 320,
    HS = 76,
    hmap = new Float32Array((HN + 1) * (HN + 1));
export function height(x: number, z: number) {
    const u = ((x + HS) / (2 * HS)) * HN,
        v = ((z + HS) / (2 * HS)) * HN;
    if (u < 0 || v < 0 || u >= HN || v >= HN) return rawHeight(x, z);
    const i = u | 0,
        j = v | 0,
        fu = u - i,
        fv = v - j,
        o = j * (HN + 1) + i;
    const a = hmap[o],
        b = hmap[o + 1],
        c = hmap[o + HN + 1],
        d = hmap[o + HN + 2];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
}


/** Fills the heightfield cache. Must run before anything queries height(). */
export function bakeHeightmap() {
    for (let j = 0; j <= HN; j++) for (let i = 0; i <= HN; i++) hmap[j * (HN + 1) + i] = rawHeight((i / HN) * 2 * HS - HS, (j / HN) * 2 * HS - HS);
}
