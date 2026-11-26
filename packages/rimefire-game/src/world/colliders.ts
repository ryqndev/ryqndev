import { clamp } from '@ryqndev/kiln-math';

import { height, STEP } from './terrain';
import type { BoxCollider, CylCollider, Hit } from './types';
import { W } from './world';

export function addBox(x: number, y: number, z: number, hx: number, hy: number, hz: number, yaw = 0): BoxCollider {
    const c: BoxCollider = { t: 0, x, y, z, hx, hy, hz, c: Math.cos(yaw), s: Math.sin(yaw), br: Math.hypot(hx, hz), off: false };
    W.cols.push(c);
    return c;
}
export function addCyl(x: number, z: number, r: number, y0: number, y1: number): CylCollider {
    const c: CylCollider = { t: 1, x, z, r, y0, y1, off: false };
    W.cols.push(c);
    return c;
}

const hit: Hit = { x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0 };
// segment vs world. returns t in [0,1] or -1. result in H
export function segHit(ax: number, ay: number, az: number, bx: number, by: number, bz: number, H: Hit = hit) {
    let best = 2,
        nx = 0,
        ny = 1,
        nz = 0;
    const dx = bx - ax,
        dy = by - ay,
        dz = bz - az;
    const cols = W.cols;
    for (let k = 0; k < cols.length; k++) {
        const c = cols[k];
        if (c.off) continue;
        if (c.t === 0) {
            const ox = ax - c.x,
                oz = az - c.z;
            const P = [ox * c.c - oz * c.s, ay - c.y, ox * c.s + oz * c.c],
                D = [dx * c.c - dz * c.s, dy, dx * c.s + dz * c.c],
                Hh = [c.hx, c.hy, c.hz];
            let t0 = 0,
                t1 = 1,
                axis = -1,
                sign = 0,
                miss = false;
            for (let i = 0; i < 3; i++) {
                if (Math.abs(D[i]) < 1e-9) {
                    if (Math.abs(P[i]) > Hh[i]) {
                        miss = true;
                        break;
                    }
                } else {
                    let ta = (-Hh[i] - P[i]) / D[i],
                        tb = (Hh[i] - P[i]) / D[i],
                        sg = -1;
                    if (ta > tb) {
                        const q = ta;
                        ta = tb;
                        tb = q;
                        sg = 1;
                    }
                    if (ta > t0) {
                        t0 = ta;
                        axis = i;
                        sign = sg;
                    }
                    if (tb < t1) t1 = tb;
                    if (t0 > t1) {
                        miss = true;
                        break;
                    }
                }
            }
            if (!miss && t0 < best) {
                best = t0;
                if (axis === 0) {
                    nx = c.c * sign;
                    ny = 0;
                    nz = -c.s * sign;
                } else if (axis === 1) {
                    nx = 0;
                    ny = sign;
                    nz = 0;
                } else if (axis === 2) {
                    nx = c.s * sign;
                    ny = 0;
                    nz = c.c * sign;
                } else {
                    nx = 0;
                    ny = 1;
                    nz = 0;
                }
            }
        } else {
            const ox = ax - c.x,
                oz = az - c.z;
            const A = dx * dx + dz * dz,
                B = 2 * (ox * dx + oz * dz),
                C = ox * ox + oz * oz - c.r * c.r;
            if (A > 1e-9) {
                const disc = B * B - 4 * A * C;
                if (disc >= 0) {
                    const t = (-B - Math.sqrt(disc)) / (2 * A);
                    if (t >= 0 && t <= 1 && t < best) {
                        const y = ay + dy * t;
                        if (y >= c.y0 && y <= c.y1) {
                            best = t;
                            nx = (ox + dx * t) / c.r;
                            ny = 0;
                            nz = (oz + dz * t) / c.r;
                        }
                    }
                }
            }
            if (dy < 0 && ay > c.y1) {
                const t = (c.y1 - ay) / dy;
                if (t <= 1 && t < best) {
                    const px = ox + dx * t,
                        pz = oz + dz * t;
                    if (px * px + pz * pz <= c.r * c.r) {
                        best = t;
                        nx = 0;
                        ny = 1;
                        nz = 0;
                    }
                }
            }
        }
    }
    // terrain
    const len = Math.hypot(dx, dy, dz),
        n = Math.max(1, Math.ceil(len / 0.9));
    let pt = 0;
    for (let i = 1; i <= n; i++) {
        const t = i / n;
        if (t > best + 1 / n) break;
        if (ay + dy * t < height(ax + dx * t, az + dz * t)) {
            let lo = pt,
                hi = t;
            for (let k = 0; k < 6; k++) {
                const m = (lo + hi) * 0.5;
                if (ay + dy * m < height(ax + dx * m, az + dz * m)) hi = m;
                else lo = m;
            }
            if (lo < best) {
                best = lo;
                const px = ax + dx * lo,
                    pz = az + dz * lo,
                    e = 0.35;
                nx = height(px - e, pz) - height(px + e, pz);
                nz = height(px, pz - e) - height(px, pz + e);
                ny = 2 * e;
                const l = Math.hypot(nx, ny, nz);
                nx /= l;
                ny /= l;
                nz /= l;
            }
            break;
        }
        pt = t;
    }
    if (best > 1) return -1;
    H.x = ax + dx * best;
    H.y = ay + dy * best;
    H.z = az + dz * best;
    H.nx = nx;
    H.ny = ny;
    H.nz = nz;
    return best;
}

// push a vertical cylinder (e.x,e.z radius r spanning y0..y1) out of colliders
export function pushOut(e: { x: number; z: number }, r: number, y0: number, y1: number) {
    let hitAny = false;
    const cols = W.cols;
    for (let k = 0; k < cols.length; k++) {
        const c = cols[k];
        if (c.off) continue;
        if (c.t === 0) {
            if (y1 < c.y - c.hy || y0 > c.y + c.hy) continue;
            const ox = e.x - c.x,
                oz = e.z - c.z,
                br = c.br + r;
            if (ox * ox + oz * oz > br * br) continue;
            const lx = ox * c.c - oz * c.s,
                lz = ox * c.s + oz * c.c;
            const px = lx - clamp(lx, -c.hx, c.hx),
                pz = lz - clamp(lz, -c.hz, c.hz),
                d2 = px * px + pz * pz;
            if (d2 > r * r) continue;
            let mx, mz;
            if (d2 < 1e-10) {
                const ex = c.hx - Math.abs(lx),
                    ez = c.hz - Math.abs(lz);
                if (ex < ez) {
                    mx = (lx < 0 ? -1 : 1) * (ex + r);
                    mz = 0;
                } else {
                    mx = 0;
                    mz = (lz < 0 ? -1 : 1) * (ez + r);
                }
            } else {
                const d = Math.sqrt(d2);
                mx = (px / d) * (r - d);
                mz = (pz / d) * (r - d);
            }
            e.x += mx * c.c + mz * c.s;
            e.z += -mx * c.s + mz * c.c;
            hitAny = true;
        } else {
            if (y1 < c.y0 || y0 > c.y1) continue;
            const ox = e.x - c.x,
                oz = e.z - c.z,
                rr = c.r + r,
                d2 = ox * ox + oz * oz;
            if (d2 < rr * rr && d2 > 1e-8) {
                const d = Math.sqrt(d2);
                e.x = c.x + (ox / d) * rr;
                e.z = c.z + (oz / d) * rr;
                hitAny = true;
            }
        }
    }
    return hitAny;
}

// walkable surface height under a point (terrain or collider tops within step reach)
export function groundAt(x: number, z: number, feet: number, r = 0.3) {
    let g = height(x, z);
    const cols = W.cols;
    for (let k = 0; k < cols.length; k++) {
        const c = cols[k];
        if (c.off) continue;
        const top = c.t === 0 ? c.y + c.hy : c.y1;
        if (top > feet + STEP || top <= g) continue;
        const ox = x - c.x,
            oz = z - c.z;
        if (c.t === 0) {
            const lx = ox * c.c - oz * c.s,
                lz = ox * c.s + oz * c.c;
            if (Math.abs(lx) < c.hx + r * 0.5 && Math.abs(lz) < c.hz + r * 0.5) g = top;
        } else if (ox * ox + oz * oz < (c.r + r * 0.5) * (c.r + r * 0.5)) g = top;
    }
    return g;
}
