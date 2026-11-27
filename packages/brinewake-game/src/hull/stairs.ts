// The steps between a ship's decks: a flight from her waist up to her quarterdeck, and the
// companionways that go down through a hatch to the decks below. A flight is two stringers with
// treads between them and a handrail on turned stanchions either side; a hatch is a coaming round
// the hole in the deck, railed on every side but the one the steps are taken from.
import type { Point } from '@ryqndev/brinewake-renderer';
import { m4, m4aim } from '@ryqndev/kiln-math';

import { type Flight, type HullKit, round } from './kit';

/** How much rise a tread takes, and how far a flight runs for each metre it climbs: a ship's stair is steep. */
export const TREAD = 0.235,
    PITCH = 0.78;
/** How high a handrail stands over the treads, and a coaming over the deck it is laid on. */
const HANDRAIL = 0.95,
    COAMING = 0.22;

/** A square timber from one point to another, `hx` half-wide across her and `hz` half-deep. Both points must be on the same side of her. */
export function timber(k: HullKit, a: Point, b: Point, hx: number, hz: number) {
    const dx = b[0] - a[0],
        dy = b[1] - a[1],
        dz = b[2] - a[2],
        l = Math.hypot(dx, dy, dz);
    k.g.pushM(m4aim(m4(), a[0], a[1], a[2], dx, dy, dz))
        .push(0, l / 2, 0)
        .box(hx, l / 2, hz, 0.012)
        .pop()
        .pop();
}

/** How high a flight is at a point of its length: its head's deck before its head, its foot's beyond its foot. */
export function flightY(f: Flight, z: number) {
    const u = (z - f.zTop) / (f.zFoot - f.zTop);
    return f.yTop + (f.yFoot - f.yTop) * (u < 0 ? 0 : u > 1 ? 1 : u);
}

/** Builds a flight: `rails` says which of its sides (-1 port, 1 starboard) carry a handrail. */
export function buildFlight(k: HullKit, f: Flight, rails: number[] = [-1, 1]) {
    const { g, q } = k,
        rise = f.yTop - f.yFoot,
        n = Math.max(3, Math.round(rise / TREAD)),
        xc = (f.x0 + f.x1) / 2,
        hw = (f.x1 - f.x0) / 2,
        // the way it climbs along her: 1 when its head is aft of its foot
        up = Math.sign(f.zTop - f.zFoot),
        at = (u: number, x: number, lift = 0): Point => [x, f.yFoot + rise * u + lift, f.zFoot + (f.zTop - f.zFoot) * u];
    // stringers: a board on edge down each side, the treads let into them
    k.wood(k.wale, 0.75);
    for (const s of [-1, 1]) timber(k, at(-0.02, xc + s * (hw - 0.035), -0.02), at(1, xc + s * (hw - 0.035), -0.06), 0.035, 0.13);
    // the treads: the deck at its head is the last of them
    k.wood(k.spar, 0.8);
    for (let i = 1; i < n; i++) {
        const p = at(i / n, xc);
        g.push(p[0], p[1] - 0.022, p[2])
            .box(hw - 0.06, 0.022, 0.125, 0.008)
            .pop();
        // a riser under each on a finished hull: on a working one the steps are open
        if (k.grand && q > 0)
            g.push(p[0], p[1] - TREAD / 2 - 0.02, p[2] + up * 0.105)
                .box(hw - 0.07, TREAD / 2 - 0.02, 0.012, 0)
                .pop();
    }
    // handrails: a stanchion at the foot, at the head and (given the detail) between, and a rail over them
    for (const s of rails) {
        const x = xc + s * (hw - 0.035),
            posts = q > 1 ? [0, 0.34, 0.67, 1] : [0, 1];
        k.wood(k.spar, 0.7);
        for (const u of posts) {
            const p = at(u, x);
            g.push(p[0], p[1], p[2])
                .cyl(0.04, HANDRAIL, round(q, 6), 0.008, 0.03)
                .pop();
            if (q > 1)
                g.push(p[0], p[1] + HANDRAIL * 0.45, p[2])
                    .cyl(0.052, 0.09, round(q, 6), 0.02, 0.04)
                    .pop();
        }
        if (k.fine) k.gilt();
        g.strut(at(0, x, HANDRAIL), at(1, x, HANDRAIL), 0.04, 0.04, round(q, 6));
        g.push(...(at(0, x, HANDRAIL) as [number, number, number]))
            .sphere(0.06, round(q, 6), 4)
            .pop();
        g.push(...(at(1, x, HANDRAIL) as [number, number, number]))
            .sphere(0.06, round(q, 6), 4)
            .pop();
    }
}

/**
 * What is built round the hole a flight goes down through, on the deck at its head: a coaming on
 * the three sides that are not stepped over (given `coaming`: an open deck wants one, to keep the
 * sea out), and a rail on stanchions over them. Where another flight comes down to land on the far
 * end of the hole, that end is left open for it (`closed` false).
 */
export function buildHatch(k: HullKit, f: Flight, coaming: boolean, closed = true) {
    const { g, q } = k,
        y = f.yTop,
        // the end that is not stepped over, and the two long sides
        end = f.zFoot,
        head = f.zTop,
        lip = coaming ? COAMING : 0;
    const sides: [Point, Point][] = [
        [
            [f.x0, y, head],
            [f.x0, y, end],
        ],
        [
            [f.x0, y, end],
            [f.x1, y, end],
        ],
        [
            [f.x1, y, end],
            [f.x1, y, head],
        ],
    ];
    for (const [a, b] of sides) {
        const along = a[0] === b[0];
        if (!along && !closed) continue;
        if (coaming) {
            k.wood(k.wale, 0.75);
            g.push((a[0] + b[0]) / 2, y + lip / 2, (a[2] + b[2]) / 2)
                .box(along ? 0.06 : Math.abs(b[0] - a[0]) / 2 + 0.06, lip / 2, along ? Math.abs(b[2] - a[2]) / 2 + 0.06 : 0.06, 0.015)
                .pop();
        }
        // stanchions along it with a rail through their heads, and a second halfway up on a ship built with care
        const len = Math.hypot(b[0] - a[0], b[2] - a[2]),
            n = Math.max(1, Math.round(len / 1.1));
        k.wood(k.spar, 0.7);
        for (let i = 0; i <= n; i++) {
            const x = a[0] + ((b[0] - a[0]) * i) / n,
                z = a[2] + ((b[2] - a[2]) * i) / n;
            g.push(x, y + lip, z)
                .cyl(0.038, HANDRAIL - lip, round(q, 6), 0.008, 0.03)
                .pop();
            g.push(x, y + HANDRAIL, z)
                .sphere(0.055, round(q, 6), 4)
                .pop();
        }
        if (k.fine) k.gilt();
        else k.hemp();
        g.strut([a[0], y + HANDRAIL - 0.04, a[2]], [b[0], y + HANDRAIL - 0.04, b[2]], 0.028, 0.028, round(q, 5));
        if (q > 0) g.strut([a[0], y + HANDRAIL * 0.55, a[2]], [b[0], y + HANDRAIL * 0.55, b[2]], 0.022, 0.022, round(q, 4));
    }
}
