import { addInstance, type Mesh, seaHeight } from '@ryqndev/brinewake-renderer';
import { m4, m4trs, rnd, rnds, TAU } from '@ryqndev/rimefire-math';

import { S } from '../state';

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
    afloat: boolean;
}

const LIMIT = 140;
// instanced wreckage: thrown clear of a hit, then left bobbing on the swell until it sinks
export const debris: Debris[] = [];
export function addDebris(mesh: Mesh, x: number, y: number, z: number, vx: number, vy: number, vz: number, s: number, life: number) {
    if (debris.length >= LIMIT) debris.shift();
    debris.push({ mesh, x, y, z, vx, vy, vz, a: rnd(TAU), b: rnd(TAU), c: rnd(TAU), wa: rnds(7), wb: rnds(7), wc: rnds(7), s, life, afloat: false });
}
const dm = m4();
export function updateDebris(dt: number) {
    for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        if ((d.life -= dt) <= 0) {
            debris.splice(i, 1);
            continue;
        }
        d.x += d.vx * dt;
        d.z += d.vz * dt;
        const sea = seaHeight(d.x, d.z, S.t);
        if (d.afloat) {
            // lying flat on the water, drifting to a stop, slipping under at the end of its life
            const drag = Math.max(0, 1 - 1.5 * dt);
            d.vx *= drag;
            d.vz *= drag;
            d.b *= Math.max(0, 1 - 3 * dt);
            d.c *= Math.max(0, 1 - 3 * dt);
            d.y = sea + 0.04 - Math.max(0, 1.5 - d.life) * 0.6;
        } else {
            d.vy -= 18 * dt;
            d.y += d.vy * dt;
            d.a += d.wa * dt;
            d.b += d.wb * dt;
            d.c += d.wc * dt;
            if (d.y < sea && d.vy < 0) d.afloat = true;
        }
        m4trs(dm, d.x, d.y, d.z, d.a, d.b, d.c, d.s);
        addInstance(d.mesh, dm);
    }
}
