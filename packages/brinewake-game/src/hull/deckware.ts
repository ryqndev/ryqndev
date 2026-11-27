// What stands on a ship's decks and hangs in her hold: the gear a ship is worked with, each piece
// built where the hull builder (models.ts) or the decks below (below.ts) say it goes. Everything is
// at the size a person uses it, whatever the size of the hull. How much of each is drawn follows
// the level of detail (HullKit.q): a capstan is a drum at the least and has its whelps, its pawls
// and its bars at the most.
import { MATERIAL, type Point } from '@ryqndev/brinewake-renderer';
import { PI, TAU } from '@ryqndev/kiln-math';

import { type HullKit, round } from './kit';

const IRON = [0.11, 0.11, 0.12],
    BRASS = [0.9, 0.68, 0.22],
    CANVAS = [0.78, 0.74, 0.62],
    SACKING = [0.5, 0.42, 0.27],
    GRATING = [0.2, 0.15, 0.1];

const iron = (k: HullKit) => k.g.mat(0.5, 0.8, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
const brass = (k: HullKit) => k.g.mat(0.3, 0.95, 0, MATERIAL.METAL).col(BRASS[0], BRASS[1], BRASS[2]);

/** A number from 0 to 1 that is always the same for the same place: what makes one cask differ from the next. */
export const hash = (a: number, b = 0) => {
    const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return v - Math.floor(v);
};

/** A cask standing on its end at a point of the deck, `r` at the bilge and `h` tall; with `lie`, on its side along that heading instead. */
export function cask(k: HullKit, x: number, y: number, z: number, r: number, h: number, lie?: number) {
    const { g, q } = k,
        seg = round(q, 9);
    if (lie === undefined) g.push(x, y, z);
    else g.push(x, y + r, z, lie, PI / 2).push(0, -h / 2, 0);
    k.wood(k.spar, 0.8).lathe(
        [
            [0, 0, 0, -1],
            [r * 0.8, 0, 0, -1],
            [r * 0.8, 0, 1, -0.3],
            [r, h * 0.5, 1, 0],
            [r * 0.8, h, 1, 0.3],
            [r * 0.8, h, 0, 1],
            [0, h, 0, 1],
        ],
        seg
    );
    if (q > 0) {
        iron(k);
        for (const f of q > 1 ? [0.1, 0.3, 0.7, 0.9] : [0.14, 0.86]) {
            const rr = r * (0.8 + 0.2 * Math.sin(PI * f)) + 0.006;
            g.push(0, h * f - 0.02, 0)
                .cyl(rr, 0.04, seg, 0.004)
                .pop();
        }
    }
    if (lie !== undefined) g.pop();
    g.pop();
}

/** A packing case, strapped with battens, turned a little on the deck. */
export function crate(k: HullKit, x: number, y: number, z: number, hx: number, hy: number, hz: number, yaw = 0) {
    const { g, q } = k;
    g.push(x, y + hy, z, yaw);
    k.wood(k.deck, 0.9).box(hx, hy, hz, 0.02);
    if (q > 0) {
        k.wood(k.wale, 0.85);
        for (const s of [-1, 1]) {
            g.push(0, s * (hy - 0.05), 0)
                .box(hx + 0.012, 0.045, hz + 0.012, 0.008)
                .pop();
            if (q > 1)
                g.push(s * (hx - 0.06), 0, 0)
                    .box(0.05, hy - 0.08, hz + 0.012, 0.008)
                    .pop();
        }
    }
    g.pop();
}

/** A sack of meal or biscuit, slumped where it was dropped. */
export function sack(k: HullKit, x: number, y: number, z: number, size = 0.34, yaw = 0) {
    k.plain(SACKING, 0.97)
        .push(x, y + size * 0.42, z, yaw, 0, 0, size * 1.25, size * 0.5, size * 0.85)
        .sphere(1, round(k.q, 8), 5)
        .pop();
}

/** A sea chest: iron-bound, its lid a little rounded, a hasp on its face. */
export function chest(k: HullKit, x: number, y: number, z: number, yaw = 0, w = 0.42) {
    const { g } = k;
    g.push(x, y, z, yaw);
    k.wood(k.wale, 0.75)
        .push(0, 0.2, 0)
        .box(w, 0.2, 0.25, 0.02)
        .pop();
    k.wood(k.spar, 0.75)
        .push(0, 0.43, 0)
        .box(w + 0.01, 0.045, 0.26, 0.035)
        .pop();
    k.ironwork();
    for (const dx of [-w * 0.62, w * 0.62])
        g.push(dx, 0.24, 0)
            .box(0.025, 0.245, 0.265, 0.004)
            .pop();
    g.push(0, 0.34, -0.26)
        .box(0.04, 0.05, 0.012, 0.004)
        .pop();
    g.pop();
}

/** A lantern hung at a point: an iron frame with horn panes round a flame. Returns where its flame is. */
export function lantern(k: HullKit, p: Point, drop = 0.32, size = 1): Point {
    const { g, q } = k,
        at: Point = [p[0], p[1] - drop - 0.16 * size, p[2]];
    k.ironwork().strut(p, [at[0], at[1] + 0.16 * size, at[2]], 0.012, 0.012, 4);
    g.push(at[0], at[1] + 0.13 * size, at[2])
        .cyl(0.1 * size, 0.035, round(q, 6), 0.008, 0.03 * size)
        .pop();
    g.push(at[0], at[1] - 0.15 * size, at[2])
        .cyl(0.085 * size, 0.025, round(q, 6), 0.006)
        .pop();
    if (q > 0) for (const dx of [-1, 1]) for (const dz of [-1, 1]) g.strut([at[0] + dx * 0.07 * size, at[1] - 0.13 * size, at[2] + dz * 0.07 * size], [at[0] + dx * 0.07 * size, at[1] + 0.13 * size, at[2] + dz * 0.07 * size], 0.008, 0.008, 3);
    k.lamp(1, 0.74, 0.38, 0.9)
        .push(at[0], at[1], at[2])
        .box(0.06 * size, 0.11 * size, 0.06 * size, 0.015)
        .pop();
    return at;
}

/**
 * The capstan: a drum the cable is hove in on, built up with whelps to grip it, a drumhead over it
 * pierced for the bars, and a ring of pawls at its foot so that it cannot run back.
 */
export function capstan(k: HullKit, y: number, z: number) {
    const { g, q } = k,
        seg = round(q, 8);
    k.wood(k.spar, 0.7)
        .push(0, y, z)
        .cyl(0.3, 0.86, seg, 0.04, 0.22)
        .pop();
    if (q > 0) {
        // the whelps: wedges of oak standing proud of the barrel
        k.wood(k.wale, 0.75);
        for (let i = 0; i < 6; i++)
            g.push(0, y + 0.1, z, (i / 6) * TAU)
                .push(0, 0.32, -0.27, 0, 0.11)
                .box(0.05, 0.32, 0.06, 0.012)
                .pop()
                .pop();
        iron(k)
            .push(0, y, z)
            .cyl(0.42, 0.07, seg, 0.015)
            .pop();
    }
    // the drumhead
    (k.fine ? k.gilt() : k.wood(k.wale, 0.7))
        .push(0, y + 0.86, z)
        .cyl(0.44, 0.2, round(q, 10), 0.03)
        .pop();
    if (q > 0) {
        k.dark();
        for (let i = 0; i < 8; i++)
            g.push(0, y + 0.96, z, (i / 8) * TAU)
                .push(0, 0, -0.43)
                .box(0.045, 0.045, 0.03, 0)
                .pop()
                .pop();
    }
    if (q > 1 && k.grand) {
        // two of her bars left shipped, for whoever is next to walk her round
        k.wood(k.spar, 0.7);
        for (const a of [0.4, 0.4 + PI * 0.75]) g.strut([Math.sin(a) * 0.3, y + 0.96, z + Math.cos(a) * 0.3], [Math.sin(a) * 1.9, y + 0.98, z + Math.cos(a) * 1.9], 0.04, 0.03, 5);
    }
}

/**
 * A hatch closed with a grating: a coaming round it, and over it either a lattice of battens that
 * lets the light and the air below, or (drawn coarsely) a dark board ruled with them.
 */
export function grating(k: HullKit, y: number, z: number, hw: number, hl: number) {
    const { g, q } = k,
        lip = 0.22;
    k.wood(k.wale, 0.75);
    for (const s of [-1, 1]) {
        g.push(s * hw, y + lip / 2, z)
            .box(0.07, lip / 2, hl + 0.07, 0.02)
            .pop();
        g.push(0, y + lip / 2, z + s * hl)
            .box(hw + 0.07, lip / 2, 0.07, 0.02)
            .pop();
    }
    if (q < 2) {
        k.wood(GRATING, 0.95)
            .push(0, y + lip - 0.04, z)
            .box(hw, 0.035, hl, 0)
            .pop();
        if (q > 0) {
            k.wood(k.spar, 0.85);
            const n = Math.max(2, Math.round(hw / 0.22));
            for (let i = -n + 1; i < n; i++)
                g.push((i * hw) / n, y + lip - 0.005, z)
                    .box(0.03, 0.012, hl, 0)
                    .pop();
        }
        return;
    }
    // the dark of the hold under it, and the lattice over that
    k.dark()
        .push(0, y + lip - 0.1, z)
        .box(hw, 0.01, hl, 0)
        .pop();
    k.wood(k.spar, 0.85);
    const step = q > 2 ? 0.13 : 0.19,
        nx = Math.max(2, Math.round(hw / step)),
        nz = Math.max(2, Math.round(hl / step));
    for (let i = -nx + 1; i < nx; i++)
        g.push((i * hw) / nx, y + lip - 0.02, z)
            .box(step * 0.26, 0.02, hl, 0)
            .pop();
    for (let i = -nz + 1; i < nz; i++)
        g.push(0, y + lip - 0.045, z + (i * hl) / nz)
            .box(hw, 0.02, step * 0.26, 0)
            .pop();
}

/** A pair of pumps: two bored elm trunks standing through the deck beside a mast, each with a brake to work it and a spout over the side of it. */
export function pumps(k: HullKit, y: number, z: number, off: number) {
    const { g, q } = k;
    for (const s of [-1, 1]) {
        const x = s * off;
        k.wood(k.wale, 0.8)
            .push(x, y, z)
            .cyl(0.13, 0.82, round(q, 7), 0.02, 0.11)
            .pop();
        if (q < 1) continue;
        iron(k)
            .push(x, y + 0.74, z)
            .cyl(0.14, 0.06, round(q, 7), 0.01)
            .pop();
        g.strut([x, y + 0.82, z], [x, y + 1.18, z], 0.02, 0.02, 4);
        g.strut([x, y + 0.6, z], [x + s * 0.3, y + 0.52, z], 0.045, 0.04, 5);
        k.wood(k.spar, 0.7).strut([x, y + 1.16, z - 0.1], [x, y + 0.98, z + 0.95], 0.035, 0.028, 5);
    }
}

/** The ship's bell, hung in a belfry: two posts and a carved head over it. */
export function belfry(k: HullKit, y: number, z: number) {
    const { g, q } = k;
    k.wood(k.wale, 0.7);
    for (const s of [-1, 1])
        g.push(s * 0.27, y + 0.62, z)
            .box(0.05, 0.62, 0.05, 0.015)
            .pop();
    (k.fine ? k.gilt() : k.wood(k.spar, 0.7))
        .push(0, y + 1.28, z)
        .box(0.38, 0.07, 0.085, 0.03)
        .pop();
    g.push(0, y + 1.38, z)
        .box(0.24, 0.05, 0.07, 0.03)
        .pop();
    brass(k)
        .push(0, y + 0.82, z)
        .lathe(
            [
                [0.15, 0, 1, 0.2],
                [0.13, 0.05, 1, 0.3],
                [0.085, 0.2, 1, 0.5],
                [0.07, 0.27, 0.6, 0.8],
                [0, 0.3, 0, 1],
            ],
            round(q, 9)
        )
        .pop();
    g.strut([0, y + 1.1, z], [0, y + 1.22, z], 0.02, 0.02, 4);
    if (q > 0) k.hemp().strut([0, y + 0.84, z], [0.03, y + 0.52, z + 0.02], 0.012, 0.012, 3);
}

/** The binnacle: a cupboard before the wheel with the compass in it, and a lamp to read it by at night. */
export function binnacle(k: HullKit, y: number, z: number) {
    const { g, q } = k;
    k.wood(k.cabin, 0.75)
        .push(0, y + 0.5, z)
        .box(0.3, 0.5, 0.2, 0.02)
        .pop();
    k.wood(k.wale, 0.7)
        .push(0, y + 1.02, z)
        .box(0.33, 0.03, 0.23, 0.012)
        .pop();
    if (q > 0) {
        // the compass under glass, and the lamp's little window beside it
        brass(k)
            .push(0, y + 1.05, z)
            .cyl(0.11, 0.05, round(q, 8), 0.01)
            .pop();
        k.plain([0.86, 0.82, 0.7], 0.3)
            .push(0, y + 1.1, z)
            .cyl(0.09, 0.006, round(q, 8), 0)
            .pop();
        k.lamp(1, 0.74, 0.38, 0.5)
            .push(0, y + 0.72, z + 0.205)
            .box(0.2, 0.1, 0.008, 0.004)
            .pop();
        k.ironwork();
        for (const s of [-1, 1])
            g.push(s * 0.31, y + 0.6, z)
                .sphere(0.035, 5, 3)
                .pop();
    }
}

/** Bitts: a pair of stout posts through the deck with a cross-piece between them, for making a cable fast to. */
export function bitts(k: HullKit, y: number, z: number, half = 0.42, h = 0.8) {
    const { g } = k;
    k.wood(k.wale, 0.75);
    for (const s of [-1, 1])
        g.push(s * half, y + h / 2, z)
            .box(0.085, h / 2, 0.085, 0.02)
            .pop();
    g.push(0, y + h * 0.62, z + 0.1)
        .box(half + 0.22, 0.075, 0.075, 0.02)
        .pop();
}

/**
 * A windlass: what a small ship heaves her cable in with instead of a capstan. A barrel lying across
 * her between two bitts, turned by handspikes stuck in the holes round it, with a pawl to hold what is gained.
 */
export function windlass(k: HullKit, y: number, z: number, half: number) {
    const { g, q } = k,
        seg = q > 1 ? 10 : 8;
    k.wood(k.wale, 0.75);
    for (const s of [-1, 1])
        g.push(s * half, y + 0.42, z)
            .box(0.09, 0.42, 0.11, 0.02)
            .pop();
    // the barrel: eight-sided, thicker in the middle where the cable takes its turns
    k.wood(k.spar, 0.75);
    for (const s of [-1, 1]) g.strut([0, y + 0.5, z], [s * (half - 0.09), y + 0.5, z], 0.2, 0.15, seg);
    if (q > 0) {
        iron(k);
        for (const x of [-half * 0.55, 0, half * 0.55]) g.strut([x - 0.03, y + 0.5, z], [x + 0.03, y + 0.5, z], 0.2 - Math.abs(x) * 0.07, 0.2 - Math.abs(x) * 0.07, seg);
        // the pawl bitt before it, and the holes its handspikes go in
        k.wood(k.wale, 0.75)
            .push(0, y + 0.36, z - 0.33)
            .box(0.07, 0.36, 0.07, 0.015)
            .pop();
        k.dark();
        for (const x of [-half * 0.3, half * 0.3])
            for (let i = 0; i < 4; i++)
                g.push(x, y + 0.5, z, 0, (i * PI) / 2 + 0.4)
                    .push(0, 0.185, 0)
                    .box(0.035, 0.012, 0.035, 0)
                    .pop()
                    .pop();
    }
    if (q > 1) {
        // a handspike left in it, and a turn of the cable round the barrel
        k.wood(k.spar, 0.7).strut([half * 0.3, y + 0.62, z + 0.13], [half * 0.3, y + 1.35, z + 0.75], 0.035, 0.025, 5);
        k.hemp();
        for (const x of [-0.12, 0, 0.12]) g.strut([-half * 0.72 + x - 0.035, y + 0.5, z], [-half * 0.72 + x + 0.035, y + 0.5, z], 0.2, 0.2, seg);
    }
}

/**
 * A mess table slung from the beams between two guns: a board on four ropes, a bench either side
 * of it, and what the watch below left on it.
 */
export function messTable(k: HullKit, x: number, y: number, z: number, head: number) {
    const { g, q } = k;
    k.wood(k.spar, 0.75)
        .push(x, y + 0.78, z)
        .box(0.42, 0.025, 0.36, 0.01)
        .pop();
    if (q > 0) {
        k.hemp();
        for (const dx of [-0.36, 0.36]) for (const dz of [-0.3, 0.3]) g.strut([x + dx, y + 0.78, z + dz], [x + dx * 0.9, head, z + dz], 0.012, 0.012, 3);
    }
    k.wood(k.wale, 0.8);
    for (const dz of [-0.7, 0.7]) {
        g.push(x, y + 0.42, z + dz)
            .box(0.42, 0.025, 0.13, 0.01)
            .pop();
        for (const dx of [-0.32, 0.32])
            g.push(x + dx, y + 0.2, z + dz)
                .box(0.03, 0.2, 0.11, 0.008)
                .pop();
    }
    if (q > 1) {
        // a kid of biscuit, and a mug at every place
        k.wood(k.spar, 0.8)
            .push(x, y + 0.805, z)
            .cyl(0.13, 0.07, round(q, 7), 0.01, 0.15)
            .pop();
        k.ironwork();
        for (const [dx, dz] of [
            [-0.25, -0.22],
            [0.22, -0.2],
            [-0.2, 0.24],
            [0.27, 0.2],
        ])
            g.push(x + dx, y + 0.805, z + dz)
                .cyl(0.04, 0.09, 6, 0.006)
                .pop();
    }
}

/**
 * A fife rail round the foot of a mast: a rail on turned posts across her, abaft the mast, stuck
 * with belaying pins, and the falls made fast to them hanging in coils.
 */
export function fifeRail(k: HullKit, y: number, z: number, half: number) {
    const { g, q } = k,
        h = 0.92;
    k.wood(k.wale, 0.7);
    for (const s of [-1, 1])
        g.push(s * half, y, z)
            .cyl(0.065, h, round(q, 6), 0.015, 0.05)
            .pop();
    g.push(0, y + h, z)
        .box(half + 0.12, 0.04, 0.085, 0.015)
        .pop();
    if (q < 1) return;
    const n = Math.max(3, Math.round((half * 2) / 0.26));
    for (let i = 0; i < n; i++) {
        const x = -half + 0.12 + ((half * 2 - 0.24) * i) / (n - 1);
        k.wood(k.spar, 0.6)
            .push(x, y + h - 0.16, z)
            .cyl(0.016, 0.4, 5, 0.004, 0.022)
            .pop();
        // every other pin has a fall belayed to it
        if (q > 1 && i % 2 === 0) {
            k.hemp();
            g.push(x, y + h - 0.42, z + 0.07, 0, PI / 2)
                .cyl(0.1, 0.035, round(q, 7), 0.01)
                .pop();
            g.push(x, y + h - 0.52, z + 0.075, 0, PI / 2)
                .cyl(0.08, 0.03, round(q, 7), 0.01)
                .pop();
        }
    }
}

/** A rope coiled down flat on the deck. */
export function coil(k: HullKit, x: number, y: number, z: number, r = 0.32) {
    const { g, q } = k;
    k.hemp();
    for (let i = 0; i < 3; i++)
        g.push(x, y + i * 0.05, z)
            .cyl(r - i * 0.035, 0.055, round(q, 9), 0.02)
            .pop();
    k.dark()
        .push(x, y + 0.155, z)
        .cyl(r * 0.45, 0.004, round(q, 7), 0)
        .pop();
}

/** A wooden bucket with a rope handle. */
export function bucket(k: HullKit, x: number, y: number, z: number) {
    const { g, q } = k;
    k.wood(k.spar, 0.8)
        .push(x, y, z)
        .cyl(0.13, 0.27, round(q, 7), 0.01, 0.16)
        .pop();
    iron(k)
        .push(x, y + 0.2, z)
        .cyl(0.158, 0.03, round(q, 7), 0.004)
        .pop();
    k.hemp();
    for (const s of [-1, 1]) g.strut([x + s * 0.15, y + 0.27, z], [x, y + 0.4, z], 0.012, 0.012, 3);
}

/** Round shot ready to hand: a row of balls in a rack against her side, `n` of them running aft from `z`. */
export function shotRack(k: HullKit, x: number, y: number, z: number, n: number, s: number) {
    const { g, q } = k;
    k.wood(k.wale, 0.8)
        .push(x, y + 0.05, z + (n * 0.2) / 2)
        .box(0.11, 0.05, (n * 0.2) / 2 + 0.06, 0.012)
        .pop();
    k.iron();
    for (let i = 0; i < n; i++)
        g.push(x - s * 0.01, y + 0.17, z + 0.1 + i * 0.2)
            .sphere(0.09, round(q, 6), 4)
            .pop();
}

/** A water cask on its side in chocks, with a dipper: where the watch on deck drinks. */
export function scuttlebutt(k: HullKit, x: number, y: number, z: number) {
    const { g } = k;
    k.wood(k.wale, 0.8);
    for (const dz of [-0.3, 0.3])
        g.push(x, y + 0.1, z + dz)
            .box(0.32, 0.1, 0.055, 0.015)
            .pop();
    cask(k, x, y + 0.12, z, 0.36, 0.95, 0);
    if (k.q > 0) {
        k.dark()
            .push(x, y + 0.845, z)
            .box(0.09, 0.006, 0.09, 0)
            .pop();
        k.ironwork().strut([x + 0.12, y + 0.86, z + 0.1], [x + 0.3, y + 1.05, z + 0.32], 0.014, 0.014, 4);
    }
}

/**
 * An anchor: a shank with a ring at its head, a wooden stock across it there, and at its crown two
 * arms each ending in a palm. `at` is its ring, `along` the way its shank lies (a unit vector) and
 * `out` the way its arms spread, at right angles to that.
 */
export function anchor(k: HullKit, at: Point, along: Point, out: Point, len = 2) {
    const { g, q } = k,
        to = (a: number, o = 0, up = 0): Point => {
            // the third axis is square to the other two: the way the stock lies
            const sx = along[1] * out[2] - along[2] * out[1],
                sy = along[2] * out[0] - along[0] * out[2],
                sz = along[0] * out[1] - along[1] * out[0];
            return [at[0] + along[0] * a + out[0] * o + sx * up, at[1] + along[1] * a + out[1] * o + sy * up, at[2] + along[2] * a + out[2] * o + sz * up];
        };
    iron(k).strut(to(0.08), to(len), 0.06, 0.075, round(q, 5));
    for (const s of [-1, 1]) {
        const palm = to(len - len * 0.3, s * len * 0.36);
        g.strut(to(len), palm, 0.07, 0.045, round(q, 5));
        g.push(palm[0], palm[1], palm[2])
            .sphere(0.12, round(q, 5), 3)
            .pop();
    }
    if (q > 0) {
        // the ring, as a few links of round iron
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU,
                b = ((i + 1) / 6) * TAU;
            g.strut(to(-0.12 + Math.cos(a) * 0.15, Math.sin(a) * 0.15), to(-0.12 + Math.cos(b) * 0.15, Math.sin(b) * 0.15), 0.022, 0.022, 4);
        }
    }
    k.wood(k.spar, 0.75).strut(to(0.22, 0, -len * 0.42), to(0.22, 0, len * 0.42), 0.085, 0.085, round(q, 5));
    if (q > 0) {
        iron(k);
        for (const u of [-0.3, -0.12, 0.12, 0.3]) {
            const p = to(0.22, 0, len * u);
            g.push(p[0], p[1], p[2])
                .sphere(0.1, 5, 3)
                .pop();
        }
    }
}

/**
 * A ship's boat, stowed upright in chocks: a small open hull of her own, with thwarts across it
 * and (given the detail) her oars laid along them.
 */
export function boat(k: HullKit, y: number, z: number, len: number) {
    const { g, q } = k,
        beam = len * 0.17,
        depth = len * 0.11,
        n = q > 1 ? 10 : 6,
        rows = q > 1 ? 5 : 3;
    // lofted like the ship that carries her: a keel, and a side that rounds up to the gunwale
    const half = (t: number) => beam * Math.pow(Math.sin(PI * (0.06 + 0.88 * t)), 0.62),
        sheer = (t: number) => depth * (1 + 0.5 * (2 * t - 1) ** 2),
        P = (t: number, v: number, s: number): Point => {
            const a = (v * PI) / 2;
            return [s * half(t) * Math.sin(a) ** 0.8, y + 0.2 + sheer(t) * (1 - Math.cos(a) ** 1.3), z + len * (0.5 - t)];
        };
    for (const s of [-1, 1]) {
        const grid: Point[][] = [];
        for (let i = 0; i <= n; i++) {
            const row: Point[] = [];
            for (let j = 0; j <= rows; j++) row.push(P(i / n, j / rows, s));
            grid.push(row);
        }
        // outside, then inside: the same shell seen from both faces
        const out = grid.map((r) => r.map((): Point => [s, -0.4, 0])),
            norm = (flip: number) =>
                grid.map((r, i) =>
                    r.map((_, j): Point => {
                        const a = grid[Math.min(n, i + 1)][j],
                            b = grid[Math.max(0, i - 1)][j],
                            c = r[Math.min(rows, j + 1)],
                            d = r[Math.max(0, j - 1)],
                            u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
                            v = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
                        let nx = u[1] * v[2] - u[2] * v[1],
                            ny = u[2] * v[0] - u[0] * v[2],
                            nz = u[0] * v[1] - u[1] * v[0];
                        const l = Math.hypot(nx, ny, nz) || 1,
                            o = out[i][j],
                            sg = (nx * o[0] + ny * o[1] + nz * o[2] < 0 ? -1 : 1) * flip;
                        nx *= sg / l;
                        ny *= sg / l;
                        nz *= sg / l;
                        return [nx, ny, nz];
                    })
                );
        k.paint().skin(grid, norm(1));
        k.wood(k.deck, 0.9).skin(
            grid.map((r) => r.map((p): Point => [p[0] - s * 0.025, p[1] + 0.02, p[2]])),
            norm(-1)
        );
        // her gunwale
        k.wood(k.wale, 0.7);
        for (let i = 0; i < n; i++) g.strut(P(i / n, 1, s), P((i + 1) / n, 1, s), 0.035, 0.035, 4);
    }
    // keel, stem and sternpost in one timber
    k.wood(k.wale, 0.7);
    for (let i = 0; i < n; i++) g.strut(P(i / n, 0, 1), P((i + 1) / n, 0, 1), 0.04, 0.04, 4);
    // thwarts, and the chocks she sits in
    k.wood(k.spar, 0.8);
    for (const t of [0.22, 0.4, 0.58, 0.76])
        g.push(0, y + 0.2 + sheer(t) * 0.72, z + len * (0.5 - t))
            .box(half(t) * 0.93, 0.02, 0.1, 0.008)
            .pop();
    k.wood(k.wale, 0.8);
    for (const t of [0.26, 0.72])
        g.push(0, y + 0.13, z + len * (0.5 - t))
            .box(half(t) * 0.8, 0.13, 0.07, 0.02)
            .pop();
    if (q > 1) {
        // a pair of oars along her thwarts
        k.wood(k.spar, 0.65);
        for (const s of [-1, 1]) {
            g.strut([s * beam * 0.3, y + 0.24 + depth * 0.78, z + len * 0.3], [s * beam * 0.22, y + 0.24 + depth * 0.78, z - len * 0.26], 0.025, 0.025, 4);
            g.push(s * beam * 0.21, y + 0.24 + depth * 0.78, z - len * 0.31)
                .box(0.06, 0.012, 0.2, 0.004)
                .pop();
        }
    }
    // lashed down across her gunwales
    if (q > 0) {
        k.hemp();
        for (const t of [0.3, 0.68]) {
            const a = P(t, 1, 1),
                b = P(t, 1, -1);
            g.strut(a, [a[0] + 0.12, y, a[2]], 0.016, 0.016, 3);
            g.strut(b, [b[0] - 0.12, y, b[2]], 0.016, 0.016, 3);
            g.strut(a, b, 0.016, 0.016, 3);
        }
    }
}

/** A skylight over a cabin: a low gabled frame set on the deck, glazed either side of its ridge. */
export function skylight(k: HullKit, y: number, z: number, hw: number, hl: number) {
    const { g, q } = k;
    k.wood(k.wale, 0.75)
        .push(0, y + 0.11, z)
        .box(hw, 0.11, hl, 0.02)
        .pop();
    g.push(0, y + 0.42, z)
        .box(0.035, 0.035, hl, 0.01)
        .pop();
    for (const s of [-1, 1]) {
        // the pane leans in from the coaming to the ridge
        const tilt = Math.atan2(0.22, hw);
        k.lamp(1, 0.8, 0.52, 0.3)
            .push(s * hw * 0.5, y + 0.31, z, 0, 0, -s * tilt)
            .box(hw * 0.5, 0.008, hl - 0.05, 0)
            .pop();
        if (q < 1) continue;
        k.wood(k.wale, 0.75);
        const bars = Math.max(2, Math.round(hl / 0.3));
        for (let i = -bars; i <= bars; i++)
            g.push(s * hw * 0.5, y + 0.325, z + (i * (hl - 0.05)) / bars, 0, 0, -s * tilt)
                .box(hw * 0.5, 0.014, 0.016, 0)
                .pop();
    }
}

/** A hammock slung fore and aft between two beams: a sag of canvas, with a blanket in it. */
export function hammock(k: HullKit, x: number, y: number, z0: number, z1: number, used: boolean) {
    const { g, q } = k,
        n = q > 1 ? 8 : 5,
        sag = 0.48,
        grid: Point[][] = [];
    for (let i = 0; i <= n; i++) {
        const f = i / n,
            w = 0.34 * Math.sin(PI * (0.12 + 0.76 * f)),
            yy = y - sag * Math.sin(PI * f) ** 0.8,
            zz = z0 + 0.35 + (z1 - z0 - 0.7) * f;
        grid.push([
            [x - w, yy + w * 0.5, zz],
            [x, yy - 0.03, zz],
            [x + w, yy + w * 0.5, zz],
        ]);
    }
    const up = grid.map((r) => r.map((_, j): Point => [(j - 1) * 0.5, -1, 0])),
        down = up.map((r) => r.map((nn): Point => [-nn[0], 1, 0]));
    k.plain(CANVAS, 0.95).skin(grid, up).skin(grid, down);
    // the clews: a spread of small lines from each end to a hook in the beam
    k.hemp();
    for (const [end, hook] of [
        [grid[0], z0],
        [grid[n], z1],
    ] as [Point[], number][])
        for (const p of q > 0 ? end : [end[1]]) g.strut(p, [x, y, hook], 0.01, 0.01, 3);
    if (used && q > 0)
        k.paint()
            .push(x, y - sag + 0.05, (z0 + z1) / 2, 0, 0, 0, 0.22, 0.07, (z1 - z0) * 0.26)
            .sphere(1, round(q, 7), 4)
            .pop();
}
