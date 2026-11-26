import { clamp, lerp, smooth, TAU } from '@ryqndev/kiln-math';

/**
 * The home port's own frame of reference. Its origin is the middle of the quay wall; local -Z runs
 * out to sea, +Z up through the town, and +X along the waterfront (to the right, looking seaward).
 */
export const HB = { x: 0, z: 0, dx: 1, dz: 0, sx: 0, sz: 1, yaw: 0 };

/** How far from the middle of the home island the quay wall stands. */
const QUAY_R = 106;

/** The town plan, in harbour-local metres. The terrain is sculpted to it and the town is built on it. */
export const PLAN = {
    /** paving levels: the waterfront, the middle terrace and the governor's terrace */
    quayY: 2.4,
    midY: 7.4,
    topY: 13,
    /** the town's limits along the waterfront */
    left: -86,
    right: 76,
    /** the quay wall runs from here to `right`; left of it the shore is a beach */
    quayLeft: -62,
    /** where the two terrace walls stand, and where the town gives way to the hills */
    wall1: 46,
    wall2: 86,
    back: 118,
    /** depth the harbour is dredged to */
    basin: -7,
    /** the head of the wharf, out in deep water: how far out its middle is, half its width along the waterfront, and half its depth */
    head: { z: -51.5, hw: 11, hd: 5.5 },
    /** the breakwater: it leaves the quay at x and runs `len` metres out to the lighthouse */
    mole: { x: 82, len: 62 },
    /** the rock the fort stands on */
    fort: { x: -108, z: -8, r: 20, y: 3.2 },
};

/** Lays the harbour out on the side of the home island with the most open sea in front of it. */
export function siteHarbour(isles: { x: number; z: number; r: number }[]) {
    const home = isles[0];
    let ang = 0,
        clear = -1;
    for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU,
            px = home.x + Math.cos(a) * 280,
            pz = home.z + Math.sin(a) * 280;
        let c = 1e9;
        for (const o of isles) if (o !== home) c = Math.min(c, Math.hypot(px - o.x, pz - o.z) - o.r);
        if (c > clear) {
            clear = c;
            ang = a;
        }
    }
    HB.dx = Math.cos(ang);
    HB.dz = Math.sin(ang);
    HB.sx = -HB.dz;
    HB.sz = HB.dx;
    HB.yaw = Math.atan2(-HB.dx, -HB.dz);
    HB.x = home.x + HB.dx * QUAY_R;
    HB.z = home.z + HB.dz * QUAY_R;
}

/** Harbour-local [x, z] to world [x, z]. */
export const toWorld = (lx: number, lz: number): [number, number] => [HB.x + HB.sx * lx - HB.dx * lz, HB.z + HB.sz * lx - HB.dz * lz];
/** World [x, z] to harbour-local [x, z]. */
export const toLocal = (x: number, z: number): [number, number] => {
    const px = x - HB.x,
        pz = z - HB.z;
    return [px * HB.sx + pz * HB.sz, -(px * HB.dx + pz * HB.dz)];
};

/**
 * Reshapes the island's natural height `h` at a world point into the harbour: a dredged basin in
 * front of a level waterfront, two terraces stepping up behind it, a rock for the fort and the
 * footing of the breakwater. Away from the town it returns `h` untouched.
 */
export function sculpt(x: number, z: number, h: number): number {
    const [lx, lz] = toLocal(x, z),
        P = PLAN;
    if (lx < -170 || lx > 130 || lz < -100 || lz > 160) return h;
    const across = smooth(P.left - 24, P.left, lx) * (1 - smooth(P.right, P.right + 24, lx)),
        m = across * smooth(-84, -56, lz) * (1 - smooth(P.back, P.back + 30, lz));
    if (m > 0) {
        // the ground lies just under the paving laid on it; each rise is hidden behind a wall
        const land = P.quayY - 0.1 + (P.midY - P.quayY) * smooth(P.wall1 + 3, P.wall1 + 9, lz) + (P.topY - P.midY) * smooth(P.wall2 + 3, P.wall2 + 9, lz);
        // 0 afloat .. 1 ashore: the bed climbs steeply to the foot of the quay wall, so a keel finds it
        // before a bowsprit finds the quay; left of the wall it shelves gently into a beach
        const shore = lerp(smooth(-26, 12, lz), smooth(-3.5, 2.5, lz), smooth(P.quayLeft - 8, P.quayLeft - 1, lx));
        h += (lerp(Math.min(h, P.basin), land, shore) - h) * m;
    }
    const f = P.fort;
    h = Math.max(h, f.y - smooth(f.r, f.r + 15, Math.hypot(lx - f.x, lz - f.z)) * 14);
    const md = Math.hypot(lx - P.mole.x, lz - clamp(lz, -P.mole.len, 4));
    // the breakwater's footing stays inside its masonry, so no sand shows along it
    h = Math.max(h, 1.2 - smooth(1.5, 6.5, md) * 9, 1.2 - smooth(5, 10.5, Math.hypot(lx - P.mole.x, lz + P.mole.len + 2)) * 9);
    return h;
}

/** 0..1: how much of the ground at a world point is the bare, trodden earth of the town's streets. */
export function trodden(x: number, z: number): number {
    const [lx, lz] = toLocal(x, z),
        P = PLAN;
    if (lx < P.left - 12 || lx > P.right + 12 || lz < 0 || lz > P.back + 12) return 0;
    return smooth(P.left - 10, P.left + 2, lx) * (1 - smooth(P.right - 2, P.right + 10, lx)) * smooth(5, 13, lz) * (1 - smooth(P.back - 8, P.back + 10, lz));
}
