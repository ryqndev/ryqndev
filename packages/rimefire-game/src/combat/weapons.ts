import { sfx } from '@ryqndev/rimefire-audio';
import { rnd } from '@ryqndev/rimefire-math';

import { flash, fxGooSplat, fxSparks, light, sprite } from '../fx';
import { hud } from '../hud';
import { segHit } from '../world';
import { addBlob, igniteAt, igniteBlob } from './blobs';
import { damage } from './damage';
import { eh, segFoes, segSphere } from './hit';
import { blobs, bolts, gels, H } from './state';

export function fireGel(x: number, y: number, z: number, vx: number, vy: number, vz: number) {
    gels.push({ x, y, z, vx, vy, vz, age: 0, seed: Math.random() });
}
// distance to whatever is under the crosshair
export function aimDist(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number) {
    let d = max;
    const t = segHit(ox, oy, oz, ox + dx * max, oy + dy * max, oz + dz * max, H);
    if (t >= 0) d = t * max;
    const te = segFoes(ox, oy, oz, ox + dx * max, oy + dy * max, oz + dz * max, 0.1);
    if (te >= 0 && te * max < d) d = te * max;
    return d;
}
export function fireSpark(x: number, y: number, z: number, dx: number, dy: number, dz: number) {
    bolts.push({ x, y, z, vx: dx * 150, vy: dy * 150, vz: dz * 150, age: 0 });
}
export function updateShots(dt: number) {
    for (let i = gels.length - 1; i >= 0; i--) {
        const g = gels[i];
        g.age += dt;
        g.vy -= 15 * dt;
        const nx = g.x + g.vx * dt,
            ny = g.y + g.vy * dt,
            nz = g.z + g.vz * dt;
        const tw = segHit(g.x, g.y, g.z, nx, ny, nz, H);
        const hx = H.x,
            hy = H.y,
            hz = H.z,
            hnx = H.nx,
            hny = H.ny,
            hnz = H.nz;
        const te = segFoes(g.x, g.y, g.z, nx, ny, nz, 0.08);
        if (te >= 0 && (tw < 0 || te < tw)) {
            const px = g.x + (nx - g.x) * te,
                py = g.y + (ny - g.y) * te,
                pz = g.z + (nz - g.z) * te;
            let ax = px - eh.cx,
                ay = py - eh.cy,
                az = pz - eh.cz;
            const l = Math.hypot(ax, ay, az) || 1;
            ax /= l;
            ay /= l;
            az /= l;
            const b = addBlob(px - ax * 0.08, py - ay * 0.08, pz - az * 0.08, ax, ay, az, eh.e, eh.node);
            if (eh.e!.burn > 0) igniteBlob(b, 0.2);
            fxGooSplat(px, py, pz, ax, ay, az, 4);
            sfx.splat(px, py, pz);
            eh.e!.wake = 1;
            gels.splice(i, 1);
        } else if (tw >= 0) {
            addBlob(hx, hy, hz, hnx, hny, hnz, null, -1);
            fxGooSplat(hx, hy, hz, hnx, hny, hnz, 5);
            sfx.splat(hx, hy, hz);
            gels.splice(i, 1);
        } else if (g.age > 4) gels.splice(i, 1);
        else {
            g.x = nx;
            g.y = ny;
            g.z = nz;
        }
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.age += dt;
        const nx = b.x + b.vx * dt,
            ny = b.y + b.vy * dt,
            nz = b.z + b.vz * dt;
        const tw = segHit(b.x, b.y, b.z, nx, ny, nz, H);
        const hx = H.x,
            hy = H.y,
            hz = H.z,
            hnx = H.nx,
            hny = H.ny,
            hnz = H.nz;
        const te = segFoes(b.x, b.y, b.z, nx, ny, nz, 0.12);
        let t = 1,
            kind = 0;
        if (te >= 0 && (tw < 0 || te < tw)) {
            t = te;
            kind = 2;
        } else if (tw >= 0) {
            t = tw;
            kind = 1;
        }
        const dx = (nx - b.x) * t,
            dy = (ny - b.y) * t,
            dz = (nz - b.z) * t;
        // anything gel-coated along the flight path lights up
        for (const o of blobs) {
            if (o.heat > 0) continue;
            if (segSphere(b.x, b.y, b.z, dx, dy, dz, o.x, o.y + 0.08, o.z, o.size * 0.8 + 0.28) >= 0) igniteBlob(o, rnd(0.09, 0.16));
        }
        sprite(2, b.x + dx, b.y + dy, b.z + dz, 0.045, 22, 10, 2.5, 1, -b.vx, -b.vy, -b.vz, 0.016);
        light(b.x + dx, b.y + dy, b.z + dz, 5, 2.2, 0.6, 4.5);
        if (kind === 2) {
            const px = b.x + dx,
                py = b.y + dy,
                pz = b.z + dz,
                e = eh.e!;
            fxSparks(px, py, pz, -b.vx / 150, -b.vy / 150, -b.vz / 150, 7);
            flash(px, py, pz, 12, 6, 2, 5, 0.12);
            sfx.tick(px, py, pz);
            const lit = igniteAt(px, py, pz, e.type === 3 ? 1.5 : 0.7, e);
            if (!lit) {
                damage(e, 5, eh.node, false);
                hud.resist();
            }
            e.wake = 1;
            bolts.splice(i, 1);
        } else if (kind === 1) {
            fxSparks(hx, hy, hz, hnx, hny, hnz, 8);
            flash(hx, hy, hz, 12, 6, 2, 5, 0.12);
            sfx.tick(hx, hy, hz);
            igniteAt(hx, hy, hz, 0.75);
            bolts.splice(i, 1);
        } else if (b.age > 1.2) bolts.splice(i, 1);
        else {
            b.x = nx;
            b.y = ny;
            b.z = nz;
        }
    }
}
