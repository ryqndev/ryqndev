import { m4, m4trs, rnd, rnds, TAU } from '@ryqndev/kiln-math';
import { addInstance, type Mesh } from '@ryqndev/rimefire-renderer';

import { height } from '../world';

interface Debris {
    mesh: Mesh;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    a: number;
    b: number;
    c: number;
    wa: number;
    wb: number;
    wc: number;
    s: number;
    life: number;
    max: number;
    r: number;
    g: number;
    bl: number;
    emis: number;
}

// instanced rigid shards thrown off by shattering enemies and ice
export const debris: Debris[] = [];
export function addDebris(mesh: Mesh, x: number, y: number, z: number, vx: number, vy: number, vz: number, s: number, life: number, r = 1, g = 1, b = 1, emis = 1) {
    if (debris.length > 160) debris.shift();
    debris.push({ mesh, x, y, z, vx, vy, vz, a: rnd(TAU), b: rnd(TAU), c: rnd(TAU), wa: rnds(9), wb: rnds(9), wc: rnds(9), s, life, max: life, r, g, bl: b, emis });
}
const dm = m4();
export function updateDebris(dt: number) {
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
        addInstance(d.mesh, dm, d.r, d.g, d.bl, 0, d.emis * Math.min(1, d.life / d.max + 0.2));
    }
}
