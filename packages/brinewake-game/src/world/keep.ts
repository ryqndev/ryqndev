import { smooth, TAU } from '@ryqndev/kiln-math';

/**
 * The king's fort: a stronghold on one of the outer islands, there to be sacked. Its frame is like
 * the harbour's: local -Z looks out to sea. Sited once the islands are known, before the terrain is baked.
 */
export const KEEP = { name: 'Fort St Hilary', x: 0, z: 0, yaw: 0, dx: 1, dz: 0, y: 3.2, r: 20 };

/**
 * Stands the fort on the shore of the island furthest from home, on the side with the most open
 * sea in front of it that is still inside the chart.
 */
export function siteKeep(isles: { x: number; z: number; r: number }[], sea: number) {
    const home = isles[0];
    let isle = isles[isles.length - 1],
        far = -1;
    for (const o of isles) {
        const d = Math.hypot(o.x - home.x, o.z - home.z);
        if (o !== home && d > far) {
            far = d;
            isle = o;
        }
    }
    // toward the middle of the chart, unless somewhere else is clearer
    let ang = Math.atan2(-isle.z, -isle.x),
        clear = -1;
    for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU,
            px = isle.x + Math.cos(a) * (isle.r + 170),
            pz = isle.z + Math.sin(a) * (isle.r + 170);
        if (Math.hypot(px, pz) > sea - 60) continue;
        let c = 1e9;
        for (const o of isles) if (o !== isle) c = Math.min(c, Math.hypot(px - o.x, pz - o.z) - o.r);
        if (c > clear) {
            clear = c;
            ang = a;
        }
    }
    KEEP.dx = Math.cos(ang);
    KEEP.dz = Math.sin(ang);
    KEEP.yaw = Math.atan2(-KEEP.dx, -KEEP.dz);
    KEEP.x = isle.x + KEEP.dx * isle.r * 1.1;
    KEEP.z = isle.z + KEEP.dz * isle.r * 1.1;
}

/** Raises the rock the fort stands on out of whatever the island's natural height `h` is at a world point. */
export const keepRock = (x: number, z: number, h: number) => Math.max(h, KEEP.y - smooth(KEEP.r, KEEP.r + 15, Math.hypot(x - KEEP.x, z - KEEP.z)) * 14);
