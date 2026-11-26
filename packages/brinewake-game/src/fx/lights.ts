import { type LightUniforms, MAX_LIGHTS } from '@ryqndev/brinewake-renderer';

interface PooledLight {
    x: number;
    y: number;
    z: number;
    r: number;
    g: number;
    b: number;
    rad: number;
    /** importance score for this frame */
    s: number;
}
interface Flash extends Omit<PooledLight, 's'> {
    life: number;
    max: number;
}

// every light pushed this frame; the brightest few near the camera reach the shaders
const LP: PooledLight[] = [];
let ln = 0;
const flashes: Flash[] = [];
const byScore = (a: PooledLight, b: PooledLight) => b.s - a.s;
export const lightU: LightUniforms = { pos: new Float32Array(MAX_LIGHTS * 4), col: new Float32Array(MAX_LIGHTS * 3), n: 0 };

/** Pushes a point light for this frame only. */
export function light(x: number, y: number, z: number, r: number, g: number, b: number, rad: number) {
    const o = LP[ln] || (LP[ln] = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, rad: 0, s: 0 });
    ln++;
    o.x = x;
    o.y = y;
    o.z = z;
    o.r = r;
    o.g = g;
    o.b = b;
    o.rad = rad;
    o.s = 0;
}
/** A light that fades out over `life` seconds. */
export function flash(x: number, y: number, z: number, r: number, g: number, b: number, rad: number, life: number) {
    if (flashes.length > 32) flashes.shift();
    flashes.push({ x, y, z, r, g, b, rad, life, max: life });
}
export function updateLights(dt: number, cx: number, cy: number, cz: number) {
    for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        if ((f.life -= dt) <= 0) {
            flashes.splice(i, 1);
            continue;
        }
        const k = (f.life / f.max) ** 2;
        light(f.x, f.y, f.z, f.r * k, f.g * k, f.b * k, f.rad);
    }
    for (let i = 0; i < ln; i++) {
        const o = LP[i],
            d2 = (o.x - cx) ** 2 + (o.y - cy) ** 2 + (o.z - cz) ** 2;
        o.s = ((o.r + o.g + o.b) * o.rad * o.rad) / (d2 + o.rad * o.rad * 0.5 + 4);
    }
    // lights left over from busier frames score zero and sort to the back
    for (let i = ln; i < LP.length; i++) LP[i].s = 0;
    LP.sort(byScore);
    const m = Math.min(MAX_LIGHTS, ln);
    for (let i = 0; i < m; i++) {
        const o = LP[i];
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
