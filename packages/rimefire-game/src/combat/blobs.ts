import { clamp, rnd } from '@ryqndev/kiln-math';
import { sfx } from '@ryqndev/rimefire-audio';
import { GOO_CAPACITY, GOO_STRIDE } from '@ryqndev/rimefire-renderer';

import { fxExplosion, fxFlame, fxGooSplat, fxIce, light, shake } from '../fx';
import { S } from '../state';
import { height, W } from '../world';
import { damage, hurtPlayer } from './damage';
import { hostXform } from './hit';
import { blobs, fires, foes, gels, goo, H } from './state';
import type { Blob, Foe } from './types';

/** Sticks a gel shot to the world or an enemy, merging into a nearby blob when possible. */
export function addBlob(x: number, y: number, z: number, nx: number, ny: number, nz: number, host: Foe | null, node: number) {
    // merge into a neighbour where possible so puddles grow instead of multiplying
    let best = null,
        bd = host ? 0.3 : 0.3,
        cnt = 0;
    for (const b of blobs) {
        if (b.host !== host || b.heat > 0) continue;
        if (host) cnt++;
        const d = Math.hypot(b.x - x, b.y - y, b.z - z);
        if (d < bd + b.size * 0.25) {
            bd = d;
            best = b;
        }
    }
    if (!best && host && cnt >= (host.type === 3 ? 30 : 12)) {
        let md = 1e9;
        for (const b of blobs)
            if (b.host === host && b.heat === 0) {
                const d = Math.hypot(b.x - x, b.y - y, b.z - z);
                if (d < md) {
                    md = d;
                    best = b;
                }
            }
    }
    if (best) {
        best.m = Math.min(host ? 14 : 30, best.m + 1);
        best.size = Math.min(host ? 0.62 : 0.85, 0.33 * Math.cbrt(best.m));
        best.wobV += 7;
        return best;
    }
    if (blobs.length > 520) {
        const i = blobs.findIndex((b) => !b.host && b.heat === 0);
        if (i >= 0) blobs.splice(i, 1);
    }
    const b: Blob = { x, y, z, nx, ny, nz, size: 0.33, m: 1, wob: 0, wobV: 9, heat: 0, fuse: 0.2, host, node, lx: 0, ly: 0, lz: 0, lnx: 0, lnz: 0, seed: Math.random(), age: 0, py: null };
    if (host) {
        const c = Math.cos(host.yaw),
            s = Math.sin(host.yaw),
            dx = x - host.x,
            dz = z - host.z;
        b.lx = dx * c - dz * s;
        b.lz = dx * s + dz * c;
        b.ly = y - host.y - (host.rise || 0) + (host.kneel || 0) * 1.43;
        b.lnx = nx * c - nz * s;
        b.lnz = nx * s + nz * c;
    } else
        for (const p of W.pylons) if (!p.lit && Math.hypot(x - p.x, z - p.z) < 3.2) b.py = p;
    blobs.push(b);
    return b;
}
export function igniteBlob(b: Blob, fuse: number) {
    if (b.heat > 0) return;
    b.heat = 0.001;
    b.fuse = fuse;
    sfx.ignite(b.x, b.y, b.z);
}
/** Ignites every idle blob near a point. With `host`, that enemy's blobs get a wider radius. Returns how many lit. */
export function igniteAt(x: number, y: number, z: number, r: number, host?: Foe) {
    let n = 0;
    for (const b of blobs) {
        if (b.heat > 0) continue;
        if (host && b.host === host) {
            const d = Math.hypot(b.x - x, b.y - y, b.z - z);
            if (d < r + 0.9) {
                igniteBlob(b, rnd(0.1, 0.18) + d * 0.05);
                n++;
            }
            continue;
        }
        const d = Math.hypot(b.x - x, b.y - y, b.z - z);
        if (d < r + b.size) {
            igniteBlob(b, rnd(0.1, 0.2));
            n++;
        }
    }
    return n;
}
function detonate(b: Blob) {
    const { x, y, z } = b,
        k = b.size / 0.33,
        Rr = 1.9 + 2.0 * b.size,
        Dm = 58 * Math.pow(b.m, 0.75);
    S.stats.det++;
    S.chain++;
    S.chainT = 0.8;
    if (S.chain > S.stats.best) S.stats.best = S.chain;
    if (S.chain === 5 || S.chain === 12 || S.chain === 25) S.hitStop = 0.045;
    fxExplosion(x, y, z, 0.6 + b.size * 1.3);
    sfx.boom(x, y, z, k);
    const p = S.pl,
        pd = Math.hypot(p.x - x, p.y + 0.9 - y, p.z - z);
    shake(clamp(0.5 * (1 - pd / 24), 0, 0.5));
    if (pd < Rr * 0.85) {
        const f = 1 - pd / (Rr * 0.85);
        hurtPlayer(Math.min(45, Dm * 0.3) * f, x, z);
        const l = Math.hypot(p.x - x, p.z - z) || 1;
        p.vx += ((p.x - x) / l) * 9 * f;
        p.vz += ((p.z - z) / l) * 9 * f;
        p.vy += 4 * f;
    }
    for (const e of foes) {
        if (e.dead) continue;
        if (b.host === e) {
            damage(e, Dm * 1.35, b.node, true);
            continue;
        }
        let md = 1e9,
            mn = -1;
        for (const h of e.hs) {
            if (h[4] !== undefined && h[4] >= 0 && e.nodes && e.nodes[h[4]].hp <= 0) continue;
            hostXform(e, h[0], h[1], h[2], H);
            const d = Math.hypot(H.x - x, H.y - y, H.z - z) - h[3];
            if (d < md) {
                md = d;
                mn = h[4] === undefined ? -1 : h[4];
            }
        }
        if (md < Rr) {
            const f = 1 - Math.pow(Math.max(0, md) / Rr, 1.5);
            damage(e, Dm * f, mn, true);
            const l = Math.hypot(e.x - x, e.z - z) || 1;
            e.vx += (((e.x - x) / l) * 7 * f) / e.mass;
            e.vz += (((e.z - z) / l) * 7 * f) / e.mass;
            if (e.type === 0) e.vy += 4 * f;
        }
    }
    for (const q of W.pylons) {
        if (q.lit) continue;
        const d = Math.hypot(q.x - x, q.z - z);
        if (d < Rr + 1.8 && y < q.y + 9) {
            q.hp -= Dm * (b.py === q ? 1.15 : 0.6);
            q.hitT = 1;
            fxIce(x + (q.x - x) * 0.3, y + 0.4, z + (q.z - z) * 0.3, 1.3, 8);
            sfx.shatter(x, y, z, 0.7);
        }
    }
    for (const o of blobs) {
        if (o === b || o.heat > 0) continue;
        const d = Math.hypot(o.x - x, o.y - y, o.z - z);
        if (d < Rr * 0.95 + o.size) igniteBlob(o, 0.07 + d * 0.05 + rnd(0.07));
    }
    if (!b.host && fires.length < 46) fires.push({ x, y: Math.max(y - 0.1, height(x, z)), z, life: 2.2 + b.size * 2.5, r: 0.9 + b.size, t: 0 });
    blobs.splice(blobs.indexOf(b), 1);
}

export function updateBlobs(dt: number) {
    let n = 0;
    const gd = goo.data;
    for (const e of foes) e.goo = 0;
    for (let i = blobs.length - 1; i >= 0; i--) {
        const b = blobs[i];
        b.age += dt;
        if (b.host) {
            const e = b.host;
            if (e.dead) {
                fxGooSplat(b.x, b.y, b.z, 0, 1, 0, 3);
                blobs.splice(i, 1);
                continue;
            }
            hostXform(e, b.lx, b.ly, b.lz, b);
            const c = Math.cos(e.yaw),
                s = Math.sin(e.yaw);
            b.nx = b.lnx * c + b.lnz * s;
            b.nz = -b.lnx * s + b.lnz * c;
            e.goo += b.size;
        }
        b.wobV += (-b.wob * 190 - b.wobV * 9) * dt;
        b.wob += b.wobV * dt;
        if (b.heat > 0) {
            b.heat += dt / b.fuse;
            if (Math.random() < dt * 40) fxFlame(b.x, b.y + 0.1, b.z, 0.5 + b.size);
            light(b.x, b.y + 0.3, b.z, 9, 3.5, 0.8, 4);
            if (b.heat >= 1) {
                detonate(b);
                continue;
            }
        }
    }
    for (const b of blobs) {
        if (n >= GOO_CAPACITY - 10) break;
        const o = n++ * GOO_STRIDE,
            pop = Math.min(1, b.age * 9);
        gd[o] = b.x;
        gd[o + 1] = b.y;
        gd[o + 2] = b.z;
        gd[o + 3] = b.size * pop;
        gd[o + 4] = b.nx;
        gd[o + 5] = b.ny;
        gd[o + 6] = b.nz;
        gd[o + 7] = b.host ? 0.7 : 0.48;
        gd[o + 8] = b.wob;
        gd[o + 9] = Math.min(1, b.heat);
        gd[o + 10] = b.seed;
        gd[o + 11] = 0;
    }
    for (const g of gels) {
        if (n >= GOO_CAPACITY) break;
        const o = n++ * GOO_STRIDE,
            l = Math.hypot(g.vx, g.vy, g.vz) || 1;
        gd[o] = g.x;
        gd[o + 1] = g.y;
        gd[o + 2] = g.z;
        gd[o + 3] = 0.13 * Math.min(1, 0.4 + g.age * 8);
        gd[o + 4] = g.vx / l;
        gd[o + 5] = g.vy / l;
        gd[o + 6] = g.vz / l;
        gd[o + 7] = 1.9;
        gd[o + 8] = Math.sin(g.age * 30) * 0.25;
        gd[o + 9] = 0;
        gd[o + 10] = g.seed;
        gd[o + 11] = 0;
    }
    goo.n = n;
}
