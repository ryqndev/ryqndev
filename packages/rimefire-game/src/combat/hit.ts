
import { foes, H } from './state';
import type { Foe } from './types';

/** Transforms a point from an enemy's local space to the world. */
export function hostXform(e: Foe, lx: number, ly: number, lz: number, o: { x: number; y: number; z: number }) {
    const c = Math.cos(e.yaw),
        s = Math.sin(e.yaw);
    o.x = e.x + lx * c + lz * s;
    o.y = e.y + ly + (e.rise || 0) - (e.kneel || 0) * 1.43;
    o.z = e.z - lx * s + lz * c;
}

/** Segment (origin + delta) vs sphere. Returns t in [0,1], 0 when starting inside, or -1. */
export function segSphere(ax: number, ay: number, az: number, dx: number, dy: number, dz: number, cx: number, cy: number, cz: number, r: number) {
    const ox = ax - cx,
        oy = ay - cy,
        oz = az - cz;
    const a = dx * dx + dy * dy + dz * dz,
        b = 2 * (ox * dx + oy * dy + oz * dz),
        c = ox * ox + oy * oy + oz * oz - r * r;
    if (c < 0) return 0;
    const disc = b * b - 4 * a * c;
    if (disc < 0 || a < 1e-9) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : -1;
}
/** Result of the last segFoes() query. */
export const eh = { e: null as Foe | null, node: -1, t: 0, cx: 0, cy: 0, cz: 0 };
/** Segment vs every enemy hit sphere. Returns the nearest t or -1; details land in `eh`. */
export function segFoes(ax: number, ay: number, az: number, bx: number, by: number, bz: number, pad: number) {
    const dx = bx - ax,
        dy = by - ay,
        dz = bz - az;
    eh.e = null;
    eh.t = 2;
    for (const e of foes) {
        if (e.dead) continue;
        if (Math.hypot(e.x - ax, e.z - az) > e.br + Math.hypot(dx, dz) + 1) continue;
        for (const h of e.hs) {
            const nd = h[4] === undefined ? -1 : h[4];
            if (nd >= 0 && e.nodes[nd].hp <= 0) continue;
            hostXform(e, h[0], h[1], h[2], H);
            const t = segSphere(ax, ay, az, dx, dy, dz, H.x, H.y, H.z, h[3] + pad);
            if (t >= 0 && t < eh.t) {
                eh.t = t;
                eh.e = e;
                eh.node = nd;
                eh.cx = H.x;
                eh.cy = H.y;
                eh.cz = H.z;
            }
        }
    }
    return eh.e ? eh.t : -1;
}
