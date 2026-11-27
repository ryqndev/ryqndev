// The ways a battery can be mounted. A mount decides three things about a ship: how many guns the
// battery has, what is done to her side for them, and what stands on her deck. The hull builder
// asks the mount for each and builds accordingly, so a new weapon that needs the ship rebuilt
// around it is one more entry in MOUNTS, and a fitting that names it (see MOUNT in ships/types.ts).
import type { Point } from '@ryqndev/brinewake-renderer';
import { m4, m4aim } from '@ryqndev/kiln-math';

import type { GunSite, HullKit } from './kit';

export interface Mount {
    /** guns it puts in a battery, on a hull drawn with `ports` gun ports a side */
    guns(ports: number): number;
    /** whether her side is pierced with a port for each gun: only then is she given fenders between them */
    ports: boolean;
    /** set when her bulwark is cut down to the deck for each gun: half the width of the opening, metres */
    cut?: number;
    /** how much bigger than a long gun's the barrels of a lower tier are, on a ship with a gun deck */
    calibre: number;
    /**
     * Builds one gun on her upper deck, with whatever is worked into her side for it.
     * Returns its muzzle in hull space, on the starboard side (x positive): where its shot starts from.
     */
    gun(k: HullKit, p: GunSite): Point;
}

// A profile for Geo.lathe from a line of [radius, height] points. Each stretch of it is flat along
// its length, so the steps of a turned shape (a ring standing proud of a barrel) come out crisp.
function turned(line: number[][]) {
    const out: number[][] = [];
    for (let i = 0; i + 1 < line.length; i++) {
        const [r0, y0] = line[i],
            [r1, y1] = line[i + 1],
            l = Math.hypot(r1 - r0, y1 - y0) || 1,
            nr = (y1 - y0) / l,
            ny = (r0 - r1) / l;
        out.push([r0, y0, nr, ny], [r1, y1, nr, ny]);
    }
    return out;
}
// A gun barrel, breech face at 0 and muzzle face at GUN_LEN: the button and neck of its cascabel,
// the base ring, two reinforces with a ring closing each, the chase tapering to the swell of the
// muzzle, and its lip. CHASE is as much of one as shows through a port in the hull's side.
const GUN_LEN = 1.9;
const MUZZLE = [[0.13, 1.06], [0.105, 1.7], [0.118, 1.72], [0.145, 1.8], [0.145, 1.86], [0.13, GUN_LEN], [0.072, GUN_LEN]];
const BARREL = turned([[0, -0.17], [0.058, -0.15], [0.072, -0.105], [0.04, -0.05], [0.15, 0], [0.185, 0], [0.185, 0.05], [0.168, 0.05], [0.158, 0.58], [0.176, 0.58], [0.176, 0.63], [0.152, 0.63], [0.14, 1.02], [0.158, 1.02], [0.158, 1.06], ...MUZZLE]),
    CHASE = turned([[0.158, 1.02], [0.158, 1.06], ...MUZZLE]),
    BORE = turned([[0.072, GUN_LEN], [0.072, 1.74], [0, 1.74]]),
    // a mortar: short, as wide as it is long, its chamber a dark well
    MORTAR = turned([[0, 0], [0.25, 0], [0.31, 0.08], [0.31, 0.2], [0.275, 0.2], [0.275, 0.6], [0.32, 0.6], [0.32, 0.7], [0.2, 0.7]]),
    WELL = turned([[0.2, 0.7], [0.2, 0.3], [0, 0.3]]);
/** How far inboard of her side a long gun's breech face stands, run out. */
const GUN_IN = 1.35;

// a barrel lying athwartships with its breech face `u` metres outboard of her side, `scale` times a long gun's size
function barrel(k: HullKit, p: GunSite, u: number, v: number, scale: number, profile: number[][], seg: number, sr = scale) {
    k.g.pushM(m4aim(m4(), p.s * (p.x + u), v, p.z, p.s, 0, 0, sr, scale, sr));
    k.iron().lathe(profile, seg);
    if (profile !== MORTAR) k.dark().lathe(BORE, seg);
    k.g.pop();
}

// How a port is dressed: wreathed in gold on the grandest hulls and framed in timber on the rest,
// with a lid swung up over it on a finished hull.
function dressPort(k: HullKit, p: GunSite) {
    const { g, grand } = k,
        { s, x, y, z } = p;
    if (grand > 1) k.gilt().strut([s * (x + 0.01), y, z], [s * (x + 0.09), y, z], 0.33, 0.3, 8);
    else {
        k.wood(k.wale, 0.7);
        for (const d of [-0.27, 0.27]) {
            g.push(s * (x + 0.02), y + d, z).box(0.05, 0.03, 0.31, 0.01).pop();
            g.push(s * (x + 0.02), y, z + d).box(0.05, 0.27, 0.03, 0.01).pop();
        }
    }
    if (!grand) return;
    if (grand > 1) k.paint();
    else k.wood(k.wale, 0.7);
    g.push(s * (x + 0.24), y + 0.5, z, 0, 0, s * -0.95).box(0.025, 0.24, 0.27, 0.01).pop();
    if (grand > 1) k.gilt().push(s * (x + 0.3), y + 0.56, z).sphere(0.06, 6, 4).pop();
}

/**
 * A gun of a lower tier, on a ship with a gun deck: all that shows of it is its chase run out
 * through a port in her side, the lid triced up over it. `calibre` is its size against a long gun's.
 */
export function lowerGun(k: HullKit, p: GunSite, calibre: number): Point {
    barrel(k, p, -GUN_IN * calibre, p.y, calibre, CHASE, 10);
    k.wood(k.wale, 0.7)
        .push(p.s * (p.x + 0.1), p.y + 0.36 * calibre, p.z)
        .box(0.12, 0.04, 0.34 * calibre, 0.01)
        .pop();
    if (k.grand > 1) k.gilt().strut([p.s * (p.x + 0.01), p.y, p.z], [p.s * (p.x + 0.09), p.y, p.z], 0.33 * calibre, 0.3 * calibre, 8);
    return [p.x + 0.65, p.y, p.z];
}

// A long gun on a truck carriage at a port: two stepped cheeks on a bed, on axletrees and four trucks,
// the barrel hung between the cheeks by its trunnions and laid by a quoin under the breech.
function longGun(k: HullKit, p: GunSite): Point {
    const { g } = k,
        y = p.y,
        floor = y - 0.4,
        // these are laid out from the breech face, as a gun is
        at = (u: number, v: number, w = 0) => p.at(u - GUN_IN, v, w),
        block = (u0: number, u1: number, v0: number, v1: number, w: number, hw: number) => p.block(u0 - GUN_IN, u1 - GUN_IN, v0, v1, w, hw);
    barrel(k, p, -GUN_IN, y, 1, BARREL, 10);
    k.wood(k.spar, 0.75);
    for (const w of [-0.2, 0.2]) {
        block(0.62, 1.14, y - 0.25, y - 0.035, w, 0.035);
        block(0.3, 0.62, y - 0.25, y - 0.12, w, 0.035);
        block(-0.04, 0.3, y - 0.25, y - 0.2, w, 0.035);
    }
    block(0, 1.12, y - 0.275, y - 0.235, 0, 0.17);
    k.wood(k.wale, 0.8);
    for (const [u, r] of [[0.2, 0.1], [0.95, 0.125]]) {
        block(u - 0.055, u + 0.055, floor + r - 0.045, floor + r + 0.045, 0, 0.25);
        for (const w of [-0.325, 0.255]) g.push(...(at(u, floor + r, w) as [number, number, number]), 0, Math.PI / 2).cyl(r, 0.07, 8, 0).pop();
    }
    // the quoin, with the handle it is drawn out by
    block(0.04, 0.34, y - 0.235, y - 0.17, 0, 0.08);
    g.strut(at(-0.12, y - 0.2), at(0.05, y - 0.2), 0.022, 0.022, 4);
    // trunnions, and the capsquares that hold them down
    k.iron().strut(at(0.85, y - 0.02, -0.26), at(0.85, y - 0.02, 0.26), 0.05, 0.05, 5);
    for (const w of [-0.2, 0.2]) block(0.75, 0.95, y + 0.025, y + 0.045, w, 0.042);
    // the breeching: a rope from a ringbolt in the bulwark either side, hanging slack to the deck and
    // up round her cascabel, to take the recoil
    k.hemp();
    for (const w of [-1, 1]) {
        const line = [at(1.14, y - 0.08, w * 0.44), at(0.7, floor + 0.07, w * 0.42), at(0.2, floor + 0.09, w * 0.38), at(-0.06, y - 0.08, w * 0.16), at(-0.1, y, 0)];
        for (let i = 0; i + 1 < line.length; i++) g.strut(line[i], line[i + 1], 0.021, 0.021, 4);
    }
    dressPort(k, p);
    return [p.x + 0.65, y, p.z];
}

// A swivel: a small gun in an iron yoke on a timber stock stepped inside the bulwark, standing over
// her rail (over the balustrade, on a hull that has one) and laid by the tiller behind it. Her side
// is not pierced for it.
function swivel(k: HullKit, p: GunSite): Point {
    const { g } = k,
        h = p.rail + (k.grand ? 0.8 : 0.3),
        post = -0.25;
    k.wood(k.spar, 0.75);
    p.block(post - 0.07, post + 0.07, p.deck, h - 0.14, 0, 0.07);
    k.iron().strut(p.at(post, h - 0.14), p.at(post, h), 0.03, 0.03, 5);
    g.strut(p.at(post, h, -0.11), p.at(post, h, 0.11), 0.028, 0.028, 5);
    g.strut(p.at(post - 0.45, h), p.at(post - 0.75, h - 0.2), 0.022, 0.016, 4);
    barrel(k, p, post - 0.45, h, 0.52, BARREL, 8);
    return [p.x + 0.4, h, p.z];
}

// A harpoon gun at a port: a slim barrel on a stock, the barbed iron standing out of its muzzle, and
// its line coiled down beside it.
function harpoonGun(k: HullKit, p: GunSite): Point {
    const { g } = k,
        y = p.y,
        floor = y - 0.4,
        at = (u: number, v: number, w = 0) => p.at(u - GUN_IN, v, w);
    k.wood(k.spar, 0.75);
    p.block(-0.39, -0.25, floor, y - 0.08, 0, 0.07);
    barrel(k, p, 0.5 - GUN_IN, y, 0.62, BARREL, 8, 0.48);
    k.iron().strut(at(0.5, y), at(0.2, y - 0.2), 0.025, 0.018, 4);
    g.strut(at(1.6, y), at(2.2, y), 0.024, 0.024, 5);
    g.strut(at(2.16, y), at(2.42, y), 0.085, 0, 6);
    for (const w of [-1, 1]) g.strut(at(2.3, y, w * 0.02), at(2.1, y, w * 0.13), 0.02, 0.008, 4);
    k.hemp();
    for (let i = 0; i < 3; i++) g.push(...(at(0.55, floor + 0.07 * i, 0.42) as [number, number, number])).cyl(0.24 - 0.03 * i, 0.07, 9, 0.02).pop();
    g.strut(at(0.55, floor + 0.2, 0.42), at(1.62, y, 0.03), 0.018, 0.018, 4);
    dressPort(k, p);
    return [p.x + 0.65, y, p.z];
}

// A mortar: bedded in a block of timber inboard at a fixed angle, throwing over her rail, with shells
// ready beside it. Her side is not pierced for it.
function mortar(k: HullKit, p: GunSite): Point {
    const { g } = k,
        floor = p.deck + 0.02,
        at = (u: number, v: number, w = 0) => p.at(u - GUN_IN, v, w),
        block = (u0: number, u1: number, v0: number, v1: number, w: number, hw: number) => p.block(u0 - GUN_IN, u1 - GUN_IN, v0, v1, w, hw);
    k.wood(k.spar, 0.75);
    block(0.05, 1.0, floor, floor + 0.2, 0, 0.36);
    for (const w of [-0.3, 0.3]) block(0.25, 0.85, floor + 0.2, floor + 0.46, w, 0.05);
    k.iron().strut(at(0.5, floor + 0.38, -0.36), at(0.5, floor + 0.38, 0.36), 0.06, 0.06, 6);
    g.pushM(m4aim(m4(), p.s * (p.x - GUN_IN + 0.38), floor + 0.24, p.z, p.s * 0.64, 0.77, 0));
    k.iron().lathe(MORTAR, 10);
    k.dark().lathe(WELL, 10);
    g.pop();
    k.iron();
    for (const w of [-0.22, 0, 0.22]) g.push(...(at(-0.2, floor + 0.14, w) as [number, number, number])).sphere(0.14, 7, 5).pop();
    return [p.x - GUN_IN + 0.38 + 0.45, floor + 0.24 + 0.54, p.z];
}

// A great gun, and the ship rebuilt round it. Her bulwark has been cut down to the deck for it (the
// hull builder does that, from `cut`); here a platform is built out from her side through the gap, on
// knees, with a timber breastwork round it low enough to fire over; stout bitts close the cut ends,
// and her side is strapped with iron beneath. The gun lies on a slide that pivots at the platform, its
// tail running on an iron racer let into the deck.
function greatGun(k: HullKit, p: GunSite): Point {
    const { g, L } = k,
        { s, t, half } = p,
        // as big as she has the beam to work, up to not quite twice a long gun
        K = Math.min(1.75, (p.x - 0.2) / 1.3),
        OUT = 0.9,
        top = p.deck + 0.03,
        bot = p.deck - 0.22,
        axis = p.deck + 0.46 * K,
        breech = -1.1 * K;
    // ---- the platform: decked like the rest of her, its edge faced with timber and banded with iron ----
    const A = [-0.12, -half],
        B = [0.5, -half],
        C = [OUT, -half * 0.5],
        D = [OUT, half * 0.5],
        E = [0.5, half],
        F = [-0.12, half];
    const P = (q: number[], v: number) => p.at(q[0], v, q[1]),
        under = p.at(0.4, p.deck - 6, 0),
        over = p.at(0.4, p.deck + 6, 0),
        mid = p.at(0.3, (top + bot) / 2, 0);
    k.wood(k.deck, 0.9);
    for (const q of [[A, B, E, F], [B, C, D, E]]) g.flat(q.map((c) => P(c, top)), under[0], under[1], under[2]);
    k.wood(k.wale, 0.8);
    for (const q of [[A, B, E, F], [B, C, D, E]]) g.flat(q.map((c) => P(c, bot)), over[0], over[1], over[2]);
    const edge = [A, B, C, D, E, F];
    for (let i = 0; i + 1 < edge.length; i++) g.flat([P(edge[i], bot), P(edge[i + 1], bot), P(edge[i + 1], top), P(edge[i], top)], mid[0], mid[1], mid[2]);
    for (const w of [-half * 0.6, 0, half * 0.6]) g.strut(p.at(OUT - 0.14, bot, w * 0.8), p.at(0.02, bot - 1, w), 0.1, 0.07, 5);
    k.iron();
    for (let i = 1; i < 4; i++) g.strut(P(edge[i], top - 0.12), P(edge[i + 1], top - 0.12), 0.045, 0.045, 5);
    // ---- the breastwork: two rails of timber on stanchions, low enough for her to fire over ----
    for (let i = 1; i < 4; i++) {
        k.wood(k.wale, 0.8);
        for (const h of [0.08, 0.21]) g.strut(P(edge[i], top + h * K), P(edge[i + 1], top + h * K), 0.085, 0.085, 6);
    }
    for (const q of [B, C, D, E]) {
        k.wood(k.spar, 0.75);
        p.block(q[0] - 0.09, q[0] + 0.09, top, top + 0.3 * K, q[1], 0.09);
        k.iron();
        p.block(q[0] - 0.11, q[0] + 0.11, top + 0.3 * K, top + 0.3 * K + 0.05, q[1], 0.11);
    }
    // ---- where her bulwark was cut: a bitt closing each end, capped in iron, and her side strapped below it ----
    for (const w of [-1, 1]) {
        const off = w * (half + 0.13),
            st = t - off / L;
        k.wood(k.wale, 0.8);
        p.block(-0.32, 0.03, p.deck, p.rail + 0.3, off, 0.13);
        k.iron();
        p.block(-0.35, 0.06, p.rail + 0.3, p.rail + 0.37, off, 0.16);
        for (let i = 0; i < 3; i++) g.strut(k.on(st, 0.35 + ((bot - 0.4) * i) / 3, s, 0.04), k.on(st, 0.35 + ((bot - 0.4) * (i + 1)) / 3, s, 0.04), 0.055, 0.055, 5);
    }
    for (let i = 0; i < 4; i++) {
        const a = t - ((half + 0.3) * (i / 2 - 1)) / L,
            b = t - ((half + 0.3) * ((i + 1) / 2 - 1)) / L;
        g.strut(k.on(a, bot - 0.12, s, 0.04), k.on(b, bot - 0.12, s, 0.04), 0.06, 0.06, 5);
    }
    // ---- the slide: two long beams tied across at either end, pivoting on a pin at the platform ----
    const cheek = 0.2 * K + 0.05,
        tail = breech - 0.2 * K,
        bed = top + 0.16;
    k.wood(k.spar, 0.75);
    for (const w of [-cheek, cheek]) p.block(tail, 0.46, top, bed, w, 0.07);
    for (const [u0, u1] of [[tail, tail + 0.16], [0.3, 0.46]]) p.block(u0, u1, top, bed - 0.02, 0, cheek);
    k.iron()
        .push(...(p.at(0.38, top - 0.04, 0) as [number, number, number]))
        .cyl(0.13, 0.24, 8, 0.02)
        .pop();
    // the racer: an arc of iron on the deck that the tail of the slide runs round on
    const R = 0.38 - tail - 0.08,
        arc = (a: number) => p.at(0.38 - R * Math.cos(a), p.deck + 0.035, R * Math.sin(a));
    for (let i = -3; i < 3; i++) g.strut(arc(i * 0.16), arc((i + 1) * 0.16), 0.03, 0.03, 4);
    // ---- the carriage on it, and the gun ----
    k.wood(k.spar, 0.75);
    for (const w of [-cheek, cheek]) {
        p.block(breech + 0.62 * K, breech + 1.14 * K, bed, axis - 0.035 * K, w, 0.06);
        p.block(breech + 0.3 * K, breech + 0.62 * K, bed, axis - 0.12 * K, w, 0.06);
        p.block(breech - 0.04 * K, breech + 0.3 * K, bed, axis - 0.2 * K, w, 0.06);
    }
    barrel(k, p, breech, axis, K, BARREL, 12);
    k.iron().strut(p.at(breech + 0.85 * K, axis - 0.02 * K, -cheek - 0.08), p.at(breech + 0.85 * K, axis - 0.02 * K, cheek + 0.08), 0.05 * K, 0.05 * K, 6);
    for (const w of [-cheek, cheek]) p.block(breech + 0.74 * K, breech + 0.96 * K, axis + 0.03 * K, axis + 0.03 * K + 0.035, w, 0.07);
    // the elevating screw under her breech
    g.strut(p.at(breech + 0.12 * K, bed, 0), p.at(breech + 0.12 * K, axis - 0.18 * K, 0), 0.035, 0.035, 5);
    // her breeching, as thick as a wrist, from the bitts round her cascabel
    k.hemp();
    for (const w of [-1, 1]) {
        const line = [p.at(-0.16, axis - 0.15, w * (half - 0.02)), p.at(breech * 0.55, top + 0.12, w * Math.min(half - 0.1, 0.95)), p.at(breech + 0.05, axis - 0.12, w * 0.34), p.at(breech - 0.1 * K, axis, 0)];
        for (let i = 0; i + 1 < line.length; i++) g.strut(line[i], line[i + 1], 0.036, 0.036, 5);
    }
    // shot for her, in a garland along the cut
    k.iron();
    for (let i = 0; i < 3; i++) g.push(...(p.at(-0.55 - 0.36 * i, top + 0.17, half - 0.22) as [number, number, number])).sphere(0.17, 8, 5).pop();
    return [p.x + 0.8 * K + 0.15, axis, p.z];
}

/** Every mount, by its number in MOUNT (ships/types.ts). */
export const MOUNTS: Mount[] = [
    { guns: (n) => n, ports: true, calibre: 1, gun: longGun },
    { guns: (n) => n, ports: false, calibre: 1, gun: swivel },
    { guns: (n) => n, ports: true, calibre: 1, gun: harpoonGun },
    { guns: (n) => n, ports: false, calibre: 1, gun: mortar },
    // one great gun where three ports were, and never fewer than one
    { guns: (n) => Math.max(1, Math.round(n / 3)), ports: false, cut: 1.45, calibre: 1.5, gun: greatGun },
];
