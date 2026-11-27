// The decks below a ship's weather deck: her gun deck, if she has one, and her hold. Each is a
// level floor between two bulkheads, lined up her sides between her frames and beamed overhead,
// reached by a companionway from the deck above. This builds them, and says where on them someone
// can stand (a Tween each): the hull builder (models.ts) decides how many there are and how deep.
//
// A ship nobody goes aboard is built without them: under each of her hatches there is then only
// the head of the companionway going down into the dark.
import { gridNormals, type Point } from '@ryqndev/brinewake-renderer';
import { clamp } from '@ryqndev/kiln-math';

import { cask, chest, coil, crate, hammock, hash, lantern, messTable, sack, shotRack } from './deckware';
import type { Flight, HullKit, Tween } from './kit';
import { LINING } from './mounts';
import { buildFlight, buildHatch } from './stairs';

/** How thick a deck is laid, plank on beam; and how deep the beams under it are. */
export const PLANK = 0.12;
const BEAM = 0.17;
/** How far inside her lining someone's feet stop, and how wide the way kept clear down the middle of a deck is, either side of her centreline. */
const SHY = 0.28,
    AISLE = 2.15;
/** How much less of the sky reaches a deck below than an open one. */
const GLOOM = 0.24;

export interface BelowPlan {
    /** the floor of each deck below, uppermost first */
    floors: number[];
    /** the stations of the bulkheads that end them: aft, then forward */
    ta: number;
    tb: number;
    /** the underside of what is over the uppermost of them, at a station: her weather deck, or her cabin's floor */
    over(t: number): number;
    /** where along her (z) that underside steps from one to the other, if it does */
    step: number | null;
    /** every flight of steps she has: those that come down onto one of these decks are built here */
    flights: Flight[];
    /** where her masts come down through them */
    masts: number[];
    /** which of them is her gun deck (-1: none), and each gun on it: its station, its side, and how far inboard of her side it reaches */
    gunDeck: number;
    guns: { t: number; s: number; reach: number }[];
    /** build the decks themselves; without it there is only a dark well under each hatch */
    inside: boolean;
}

// what is stowed somewhere on a deck: which kind, where, and how it lies
interface Stowed {
    kind: number;
    x: number;
    z: number;
    /** half its size across her and along her, and a number that is its own */
    hx: number;
    hz: number;
    seed: number;
}
const CASK = 0,
    CRATE = 1,
    SACKS = 2,
    CHEST = 3,
    COIL = 4;

export function buildBelow(k: HullKit, plan: BelowPlan): Tween[] {
    const { g, q } = k,
        { floors, flights } = plan,
        zFore = k.zAt(plan.tb),
        zAft = k.zAt(plan.ta),
        tweens: Tween[] = [],
        // how far out her lining stands at a point of her length and a height
        hw = (z: number, y: number) => Math.max(0.3, k.outX(k.tAt(z), y) - LINING),
        lo = (f: Flight) => Math.min(f.zTop, f.zFoot),
        hi = (f: Flight) => Math.max(f.zTop, f.zFoot);

    floors.forEach((yF, i) => {
        const tier = i + 1,
            // the underside of the deck overhead
            head = (z: number) => (i ? floors[i - 1] - PLANK : plan.over(k.tAt(z))),
            // the flights that go down from this deck, through holes in its floor, and those that come down onto it, through holes overhead
            down = flights.filter((f) => f.top === tier),
            up = flights.filter((f) => f.foot === tier),
            here = [...down, ...up],
            gunDeck = i === plan.gunDeck,
            blocks: number[][] = [],
            lamps: Point[] = [],
            stowed: Stowed[] = [],
            posts: number[] = [],
            slung: number[][] = [],
            tables: number[][] = [];
        let lowest = Infinity;
        for (let j = 0; j <= 24; j++) lowest = Math.min(lowest, head(zFore + ((zAft - zFore) * j) / 24));

        // ---- where someone can stand on it ----
        // A hold is stowed solid at either end: what is walked is the middle of it, round the foot of the steps.
        let z0 = zFore + 0.3,
            z1 = zAft - 0.3;
        const bay = gunDeck ? 0 : clamp((zAft - zFore) * 0.2, 1.4, 5);
        if (bay) {
            const need0 = Math.min(...here.map(lo), (zFore + zAft) / 2) - 2.2,
                need1 = Math.max(...here.map(hi), (zFore + zAft) / 2) + 2.2;
            z0 = Math.max(z0, Math.min(zFore + bay, need0));
            z1 = Math.min(z1, Math.max(zAft - bay, need1));
        }
        const near = (z: number, pad: number) => here.some((f) => z > lo(f) - pad && z < hi(f) + pad),
            mast = (z: number, pad: number) => plan.masts.some((m) => Math.abs(z - m) < pad);
        // pillars under the beams down her centreline, clear of her steps and her masts
        for (let z = z0 + 1.3; z < z1 - 1; z += 2.7) {
            if (near(z, 1.5) || mast(z, 1)) continue;
            posts.push(z);
            blocks.push([-0.08, 0.08, z - 0.08, z + 0.08]);
        }
        if (gunDeck) {
            for (const gun of plan.guns) {
                const z = k.zAt(gun.t),
                    w = hw(z, yF);
                blocks.push(gun.s < 0 ? [-w, -(w - gun.reach), z - 0.5, z + 0.5] : [w - gun.reach, w, z - 0.5, z + 0.5]);
            }
            // the watch below mess between the guns: a table slung in every gap wide enough for one
            for (const s of [-1, 1]) {
                const at = plan.guns.filter((gun) => gun.s === s).map((gun) => k.zAt(gun.t)).sort((a, b) => a - b);
                for (let n = 0; n + 1 < at.length; n++) {
                    const z = (at[n] + at[n + 1]) / 2,
                        x = s * (hw(z, yF) - 0.95);
                    if (at[n + 1] - at[n] < 3.4 || Math.abs(x) < AISLE - 0.6 || near(z, 1.2)) continue;
                    tables.push([x, z]);
                    blocks.push([x - 0.45, x + 0.45, z - 0.85, z + 0.85]);
                }
            }
        } else {
            // the bays at either end, stowed from side to side
            for (const [from, to, fore] of [
                [zFore + 0.45, z0 - 0.35, 1],
                [z1 + 0.35, zAft - 0.45, 0],
            ]) {
                for (let z = from + 0.45; z < to - 0.3; z += 0.92) {
                    const w = hw(z, yF) - 0.5;
                    for (let x = -w + 0.1; x < w; x += 0.95) {
                        const seed = hash(x * 3.1 + tier, z * 1.7);
                        if (seed < 0.12 || mast(z, 0.8)) continue;
                        stowed.push({ kind: fore ? (seed < 0.8 ? CASK : SACKS) : seed < 0.55 ? CRATE : seed < 0.8 ? SACKS : CASK, x: x + 0.3 * (seed - 0.5), z, hx: 0.4, hz: 0.4, seed });
                    }
                }
            }
            // and along her sides in between, where she is broad enough to leave a way down the middle
            for (const s of [-1, 1])
                for (let z = z0 + 0.6; z < z1 - 0.5; z += 1.05) {
                    const w = hw(z, yF),
                        deep = Math.min(1.35, w - AISLE),
                        seed = hash(z * 2.3 + tier * 7, s);
                    if (deep < 0.62 || seed < 0.22 || near(z, 0.9)) continue;
                    const kind = seed < 0.5 ? CASK : seed < 0.76 ? CRATE : seed < 0.9 ? SACKS : CHEST,
                        hx = Math.min(deep / 2, 0.46);
                    stowed.push({ kind, x: s * (w - 0.12 - hx), z, hx, hz: 0.42, seed });
                    blocks.push([s * (w - 0.12 - hx) - hx, s * (w - 0.12 - hx) + hx, z - 0.45, z + 0.45]);
                }
            // her cable, coiled down forward
            if (hw(z0 + 0.9, yF) > 1.9 && !near(z0 + 0.9, 1.2)) {
                stowed.push({ kind: COIL, x: 0, z: z0 + 0.75, hx: 0.6, hz: 0.6, seed: 0.5 });
                blocks.push([-0.6, 0.6, z0 + 0.15, z0 + 1.35]);
            }
            // the watch below sling their hammocks to port, abaft the steps
            const berth = Math.max(...here.map(hi), z0) + 1.5;
            for (let n = 0; n < 4; n++) {
                const z = berth + Math.floor(n / 2) * 2.25,
                    x = -(0.95 + (n % 2) * 0.95);
                if (z + 2.1 > z1 || hw(z + 1, yF) < Math.abs(x) + 0.75) continue;
                slung.push([x, z, z + 2.05, hash(n, tier)]);
                blocks.push([x - 0.36, x + 0.36, z + 0.35, z + 1.7]);
            }
        }
        // a lantern on every other pillar; with none to hang one on, a single one before the forward bulkhead
        const lit = posts.filter((_, n) => n % 2 === 0),
            hooks: Point[] = lit.length ? lit.map((z): Point => [0.3, yF + 2.12, z]) : [[-1.2, lowest - 0.12, z0 + 0.5]];
        for (const h of hooks) lamps.push([h[0], h[1] - 0.2, h[2]]);

        const N = 12;
        tweens.push({
            y: yF,
            head: lowest,
            z0,
            z1,
            w: Array.from({ length: N + 1 }, (_, j) => Math.max(0, hw(z0 + ((z1 - z0) * j) / N, yF) - SHY)),
            blocks,
            lamps,
        });
        if (!plan.inside) return;

        // ---- the deck itself: stations along it, close either side of the edge of every hole ----
        const was = g.ao;
        g.ao = GLOOM;
        const zs: number[] = [],
            step = [1.5, 1.1, 0.8, 0.6][q],
            m = Math.max(4, Math.ceil((zAft - zFore) / step));
        for (let j = 0; j <= m; j++) zs.push(zFore + ((zAft - zFore) * j) / m);
        for (const f of here) zs.push(lo(f), hi(f));
        if (!i && plan.step !== null && plan.step > zFore && plan.step < zAft) zs.push(plan.step - 0.012, plan.step + 0.012);
        zs.sort((a, b) => a - b);
        for (let j = zs.length - 1; j > 0; j--) if (zs[j] - zs[j - 1] < 1e-3) zs.splice(j, 1);
        // her lining, from the floor to the deck overhead
        const rows = 3 + q;
        for (const s of [-1, 1]) {
            const P = zs.map((z) => Array.from({ length: rows }, (_, r): Point => {
                const y = yF + ((head(z) - yF) * r) / (rows - 1);
                return [s * hw(z, y), y, z];
            }));
            k.wood(k.plank, 0.9).skin(P, gridNormals(P, () => [-s, 0, 0]));
        }
        // the planks under foot and the planks overhead, left open wherever a flight of steps passes through
        const laid = (y: (z: number) => number, holes: Flight[], face: number) => {
            for (let j = 0; j + 1 < zs.length; j++) {
                const a = zs[j],
                    b = zs[j + 1],
                    mid = (a + b) / 2,
                    cuts = holes.filter((f) => mid > lo(f) && mid < hi(f)).sort((f, h) => f.x0 - h.x0),
                    ya = y(a + 1e-4),
                    yb = y(b - 1e-4);
                // from her port side to the first hole, between holes, and from the last to her starboard side
                for (let c = 0; c <= cuts.length; c++) {
                    const xa0 = c ? cuts[c - 1].x1 : -hw(a, ya),
                        xb0 = c ? cuts[c - 1].x1 : -hw(b, yb),
                        xa1 = c < cuts.length ? cuts[c].x0 : hw(a, ya),
                        xb1 = c < cuts.length ? cuts[c].x0 : hw(b, yb);
                    g.flat(
                        [
                            [xa0, ya, a],
                            [xa1, ya, a],
                            [xb1, yb, b],
                            [xb0, yb, b],
                        ],
                        0,
                        (ya + yb) / 2 - face * 50,
                        mid
                    );
                }
            }
        };
        k.wood(k.deck, 0.92);
        laid(() => yF, down, 1);
        k.wood(k.plank, 0.92);
        laid(head, up, -1);
        // the bulkheads that end it, each with a door to whatever is kept beyond
        for (const [z, face] of [
            [zFore, 1],
            [zAft, -1],
        ]) {
            k.wood(k.cabin, 0.9);
            for (let r = 0; r + 1 < rows; r++) {
                const ya = yF + ((head(z) - yF) * r) / (rows - 1),
                    yb = yF + ((head(z) - yF) * (r + 1)) / (rows - 1);
                g.flat(
                    [
                        [-hw(z, ya), ya, z],
                        [hw(z, ya), ya, z],
                        [hw(z, yb), yb, z],
                        [-hw(z, yb), yb, z],
                    ],
                    0,
                    ya,
                    z - face * 50
                );
            }
            const dz = z + face * 0.035,
                dh = 1.95;
            k.wood(k.wale, 0.75);
            for (const s of [-1, 1])
                g.push(s * 0.5, yF + dh / 2, dz)
                    .box(0.055, dh / 2, 0.04, 0.012)
                    .pop();
            g.push(0, yF + dh + 0.05, dz)
                .box(0.56, 0.055, 0.04, 0.012)
                .pop();
            for (let n = 0; n < 4; n++)
                k.wood(n % 2 ? k.spar : k.plank, 0.85)
                    .push(-0.33 + n * 0.22, yF + dh / 2, dz)
                    .box(0.105, dh / 2 - 0.02, 0.02, 0.006)
                    .pop();
            k.wood(k.wale, 0.75);
            for (const f of [0.16, 0.5, 0.84])
                g.push(0, yF + dh * f, dz + face * 0.02)
                    .box(0.43, 0.05, 0.02, 0.008)
                    .pop();
            k.ironwork();
            for (const f of [0.16, 0.84])
                g.push(0.28, yF + dh * f, dz + face * 0.035)
                    .box(0.16, 0.022, 0.012, 0.004)
                    .pop();
            g.push(-0.34, yF + dh * 0.5, dz + face * 0.05)
                .cyl(0.045, 0.012, 7, 0.004)
                .pop();
        }
        // ---- her timbers: a beam across under the deck every few feet, a frame up her side at each, and a knee between them ----
        k.wood(k.spar, 0.85);
        const pitch = q ? 1.3 : 2.6,
            beams = Math.max(2, Math.round((zAft - zFore) / pitch));
        for (let n = 1; n < beams; n++) {
            const z = zFore + ((zAft - zFore) * n) / beams,
                c = head(z);
            if (!i && plan.step !== null && Math.abs(z - plan.step) < 0.12) continue;
            // a beam that would cross a hatch stops at the carling either side of it
            const cuts = up.filter((f) => z > lo(f) - 0.1 && z < hi(f) + 0.1).sort((f, h) => f.x0 - h.x0);
            for (let n2 = 0; n2 <= cuts.length; n2++) {
                const xa = n2 ? cuts[n2 - 1].x1 + 0.14 : -hw(z, c) + 0.02,
                    xb = n2 < cuts.length ? cuts[n2].x0 - 0.14 : hw(z, c) - 0.02;
                if (xb - xa > 0.1)
                    g.push((xa + xb) / 2, c - BEAM / 2, z)
                        .box((xb - xa) / 2, BEAM / 2, 0.075, 0.012)
                        .pop();
            }
            if (q < 1) continue;
            for (const s of [-1, 1]) {
                for (let r = 0; r + 1 < rows; r++) {
                    const ya = yF + ((c - yF) * r) / (rows - 1),
                        yb = yF + ((c - yF) * (r + 1)) / (rows - 1);
                    g.strut([s * (hw(z, ya) - 0.03), ya, z], [s * (hw(z, yb) - 0.03), yb, z], 0.075, 0.075, 4);
                }
                if (q > 1) g.strut([s * (hw(z, c) - 0.62), c - BEAM, z], [s * (hw(z, c - 0.6) - 0.06), c - 0.62, z], 0.06, 0.06, 4);
            }
        }
        // carlings round every hatch overhead, and the sides of the hole through the planking
        for (const f of up) {
            const a = lo(f),
                b = hi(f),
                c = Math.min(head(a), head(b));
            k.wood(k.wale, 0.82);
            for (const x of [f.x0 - 0.07, f.x1 + 0.07])
                g.push(x, c - BEAM / 2, (a + b) / 2)
                    .box(0.07, BEAM / 2, (b - a) / 2 + 0.14, 0.012)
                    .pop();
            for (const z of [a - 0.07, b + 0.07])
                g.push((f.x0 + f.x1) / 2, c - BEAM / 2, z)
                    .box((f.x1 - f.x0) / 2, BEAM / 2, 0.07, 0.012)
                    .pop();
            const top = (z: number) => head(z) + PLANK + 0.02,
                xc = (f.x0 + f.x1) / 2,
                zc = (a + b) / 2;
            for (const x of [f.x0, f.x1])
                g.flat(
                    [
                        [x, head(a), a],
                        [x, head(b), b],
                        [x, top(b), b],
                        [x, top(a), a],
                    ],
                    x + (x - xc) * 50,
                    c,
                    zc
                );
            for (const z of [a, b])
                g.flat(
                    [
                        [f.x0, head(z), z],
                        [f.x1, head(z), z],
                        [f.x1, top(z), z],
                        [f.x0, top(z), z],
                    ],
                    xc,
                    c,
                    z + (z - zc) * 50
                );
        }
        // pillars, and the lanterns hung on them
        k.wood(k.wale, 0.8);
        for (const z of posts) {
            const c = head(z);
            g.push(0, (yF + c - BEAM) / 2, z)
                .box(0.075, (c - BEAM - yF) / 2, 0.075, 0.015)
                .pop();
            if (q > 0) {
                g.push(0, yF + 0.07, z)
                    .box(0.11, 0.07, 0.11, 0.02)
                    .pop();
                g.push(0, c - BEAM - 0.07, z)
                    .box(0.11, 0.07, 0.11, 0.02)
                    .pop();
            }
        }
        g.ao = 1;
        for (const h of hooks) {
            if (lit.length) k.ironwork().strut([0.07, h[1], h[2]], h, 0.014, 0.014, 4);
            lantern(k, h, 0.04);
        }
        g.ao = GLOOM;

        // ---- what is kept on it ----
        for (const c of stowed) {
            const a = c.seed * 6.28;
            if (c.kind === CASK) {
                const r = 0.3 + 0.07 * hash(c.seed, 3);
                cask(k, c.x, yF, c.z, r, 0.92 + 0.2 * hash(c.seed, 5));
                // a second tier where the first leaves it the headroom
                if (q > 0 && hash(c.seed, 9) < 0.34 && Math.abs(c.x) < hw(c.z, yF + 1.3) - 0.5) cask(k, c.x + 0.05, yF + 0.95 + 0.2 * hash(c.seed, 5), c.z, r * 0.9, 0.8);
            } else if (c.kind === CRATE) {
                const h = 0.3 + 0.22 * hash(c.seed, 2);
                crate(k, c.x, yF, c.z, Math.min(c.hx, 0.42), h, 0.4, (c.seed - 0.5) * 0.3);
                if (q > 0 && hash(c.seed, 4) < 0.4) crate(k, c.x, yF + h * 2, c.z, 0.3, 0.22, 0.3, (c.seed - 0.5) * 1.6);
            } else if (c.kind === SACKS) {
                sack(k, c.x - 0.12, yF, c.z, 0.36, a);
                sack(k, c.x + 0.16, yF, c.z + 0.1, 0.33, a + 1.3);
                if (q > 0) sack(k, c.x, yF + 0.3, c.z + 0.04, 0.34, a + 0.6);
            } else if (c.kind === CHEST) chest(k, c.x, yF, c.z, c.x > 0 ? -Math.PI / 2 : Math.PI / 2);
            else {
                coil(k, c.x, yF, c.z, 0.58);
                if (q > 0) coil(k, c.x, yF + 0.15, c.z, 0.5);
            }
        }
        for (const [x, za, zb, seed] of slung) hammock(k, x, lowest - BEAM - 0.02, za, zb, seed < 0.6);
        for (const [x, z] of tables) messTable(k, x, yF, z, head(z) - BEAM);
        if (gunDeck && q > 0)
            // shot to hand between her guns
            plan.guns.forEach((gun, n) => {
                const z = k.zAt(gun.t) + 0.85,
                    w = hw(z, yF);
                if (n % 2 === 0 && z + 0.9 < z1) shotRack(k, gun.s * (w - 0.16), yF, z, 4, gun.s);
            });

        // ---- the steps that come down onto it, and a rail round every hole in its floor ----
        for (const f of up) {
            // the head of the uppermost flight is out in the daylight
            g.ao = f.top ? GLOOM : 0.7;
            buildFlight(k, f);
        }
        g.ao = GLOOM;
        // a hole that the flight from above lands on the end of is left open there
        for (const f of down) buildHatch(k, f, false, !up.some((u) => u.x0 < f.x1 && u.x1 > f.x0 && lo(u) < hi(f) && hi(u) > lo(f)));
        g.ao = was;
    });

    if (!plan.inside)
        // nobody goes below on this one: her companionway goes down into a well of darkness
        for (const f of flights) {
            if (f.top !== 0 || f.foot < 1) continue;
            buildFlight(k, f);
            const a = lo(f),
                b = hi(f),
                xc = (f.x0 + f.x1) / 2,
                zc = (a + b) / 2,
                y0 = f.yFoot - 0.05,
                y1 = f.yTop - 0.02;
            k.dark();
            for (const x of [f.x0 - 0.01, f.x1 + 0.01])
                g.flat(
                    [
                        [x, y0, a],
                        [x, y0, b],
                        [x, y1, b],
                        [x, y1, a],
                    ],
                    x + (x - xc) * 50,
                    y0,
                    zc
                );
            for (const z of [a - 0.01, b + 0.01])
                g.flat(
                    [
                        [f.x0, y0, z],
                        [f.x1, y0, z],
                        [f.x1, y1, z],
                        [f.x0, y1, z],
                    ],
                    xc,
                    y0,
                    z + (z - zc) * 50
                );
            g.flat(
                [
                    [f.x0, y0, a],
                    [f.x1, y0, a],
                    [f.x1, y0, b],
                    [f.x0, y0, b],
                ],
                xc,
                y0 - 50,
                zc
            );
        }
    return tweens;
}
