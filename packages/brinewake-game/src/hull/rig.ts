// A ship's masts and everything that holds them up or works her sails. Each mast is a lower mast
// stepped on her keel and a topmast doubled on its head, the two held together by a top and a cap;
// her yards are slung before them; shrouds come down to deadeyes at her rail with ratlines to climb
// them by, stays run forward and backstays aft; and a bowsprit stands out over her stem.
//
// Where anything is never depends on the level of detail (see HullKit.q): only how much of it is
// drawn, and how round.
import { MATERIAL, type Point } from '@ryqndev/brinewake-renderer';
import { clamp } from '@ryqndev/kiln-math';

import { type HullKit, round } from './kit';

/** One square sail: where its yard sits in hull space, and its size fully set. */
export interface SailSlot {
    y: number;
    z: number;
    w: number;
    h: number;
}

/** One fore-and-aft sail, a triangle in hull space: jibs on the stays forward, a driver on the last mast. */
export interface JibSlot {
    /** tack, where it is made fast; head, at the top of its luff; clew, the free corner it furls away from */
    tack: Point;
    head: Point;
    clew: Point;
}

export interface MastSpec {
    z: number;
    h: number;
    /** per sail: yard height above the deck, width, drop */
    sails: number[][];
}

export interface RigPlan {
    masts: MastSpec[];
    /** how far down a mast at `z` is stepped: through whatever decks are under it */
    step(z: number): number;
    /** the top of her side at a station: where what comes down to her rail is made fast */
    brink(t: number, s: number): Point;
    /** whether her rail is open and whole at a station on a side, so that a channel can be built out from it */
    open(t: number, s: number): boolean;
    /** the top of her stern, and where her stern face is at a height */
    sternTop: number;
    sternZ(y: number): number;
}

export interface Rig {
    sails: SailSlot[];
    jibs: JibSlot[];
    /** the masthead her flag flies from, and those that fly a streamer */
    flag: Point;
    pennants: Point[];
    /** where a lantern hangs at the foot of each mast, for whoever lights them */
    feet: Point[];
}

const IRON = [0.11, 0.11, 0.12],
    CANVAS = [0.78, 0.74, 0.62];

const lerp3 = (a: Point, b: Point, f: number): Point => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];

export function buildRig(k: HullKit, plan: RigPlan): Rig {
    const { g, L, grand, fine, q } = k,
        zs = L / 2,
        sails: SailSlot[] = [],
        heads: Point[] = [],
        tops: Point[] = [],
        lamps: Point[] = [];
    const iron = () => g.mat(0.5, 0.8, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
    // a block: the wooden shell a rope is rove through, wherever one changes its lead
    const block = (p: Point, size = 0.09) => {
        k.wood(k.wale, 0.7)
            .push(p[0], p[1], p[2])
            .box(size * 0.55, size, size * 0.8, size * 0.3)
            .pop();
        k.tarred();
    };

    for (const m of plan.masts) {
        const t = k.tAt(m.z),
            d = k.dAt(t),
            r = 0.17 + m.h * 0.0075,
            head: Point = [0, d + m.h, m.z],
            first = m.sails[0],
            // the top stands just over her lowest yard; a mast that carries only a sail aloft has it under that sail's foot
            topH = clamp(m.sails.length > 1 ? first[0] + m.h * 0.05 : first[0] - first[2] - 0.6, m.h * 0.42, m.h * 0.75),
            topY = d + topH,
            capY = topY + m.h * 0.07,
            // the topmast stands before the head of the lower mast
            fore = r * 0.95,
            rt = r * 0.62,
            step = plan.step(m.z),
            // how far out the top spreads her topmast shrouds
            R = grand ? 0.8 + 0.22 * grand : 0.75;
        // ---- the lower mast, and the topmast doubled on its head ----
        k.wood(k.spar, 0.7)
            .push(0, step, m.z)
            .cyl(r, capY - step, round(q, 8), 0.02, r * 0.74)
            .pop();
        g.push(0, topY - 0.45, m.z - fore)
            .cyl(rt, head[1] - topY + 0.45, round(q, 7), 0.02, rt * 0.45)
            .pop();
        // the mast coat, where it comes up through the deck
        if (q > 0)
            k.plain(CANVAS, 0.9)
                .push(0, d, m.z)
                .cyl(r * 1.35, 0.16, round(q, 8), 0.04, r * 1.05)
                .pop();
        // wooldings: turns of rope hove tight round a made mast, every fathom of it
        if (q > 1) {
            k.hemp();
            for (let y = d + 1.9; y < topY - 1.2; y += 1.85) {
                const rr = r - (r * 0.26 * (y - step)) / (capY - step);
                g.push(0, y, m.z)
                    .cyl(rr + 0.018, 0.2, round(q, 8), 0.01)
                    .pop();
            }
        }
        // ---- the top: a platform on trestle-trees and crosstrees on a finished hull; bare crosstrees on a working one ----
        if (grand) {
            if (q > 0) {
                k.wood(k.wale, 0.75);
                for (const s of [-1, 1])
                    g.push(s * (r * 0.74 + 0.07), topY - 0.1, m.z - fore * 0.5)
                        .box(0.065, 0.1, R * 0.92, 0.015)
                        .pop();
                for (const dz of [-0.5, 0.42])
                    g.push(0, topY - 0.07, m.z - fore * 0.5 + dz * R)
                        .box(R * 0.97, 0.06, 0.06, 0.015)
                        .pop();
            }
            k.wood(k.spar, 0.75)
                .push(0, topY, m.z - fore * 0.5)
                .cyl(R, 0.09, round(q, 10 + 2 * grand), 0.03)
                .pop();
            if (fine)
                k.gilt()
                    .push(0, topY + 0.09, m.z - fore * 0.5)
                    .cyl(R + 0.02, 0.05, round(q, 10 + 2 * grand), 0.02)
                    .pop();
            // a rail round its after side for whoever is sent up there
            if (grand > 1 && q > 0) {
                const n = q > 1 ? 6 : 3,
                    rim = (i: number): Point => [Math.sin(((i / n) * 2 - 1) * 1.25) * (R - 0.06), topY + 0.09, m.z - fore * 0.5 + Math.cos(((i / n) * 2 - 1) * 1.25) * (R - 0.06)];
                k.gilt();
                for (let i = 0; i <= n; i++) {
                    const p = rim(i);
                    g.strut(p, [p[0], p[1] + 0.8, p[2]], 0.025, 0.025, 4);
                    if (i < n) g.strut([p[0], p[1] + 0.8, p[2]], [rim(i + 1)[0], p[1] + 0.8, rim(i + 1)[2]], 0.03, 0.03, 4);
                }
            }
        } else {
            k.wood(k.wale, 0.75);
            for (const dz of [-0.24, 0.3])
                g.push(0, topY - 0.05, m.z - fore * 0.5 + dz)
                    .box(R, 0.05, 0.055, 0.015)
                    .pop();
            for (const s of [-1, 1])
                g.push(s * (r * 0.74 + 0.06), topY - 0.13, m.z - fore * 0.5)
                    .box(0.055, 0.08, 0.5, 0.015)
                    .pop();
            // a cask lashed to the topmast for a lookout to stand in
            if (q > 0) {
                k.wood(k.spar, 0.8)
                    .push(0, topY, m.z - fore)
                    .cyl(0.44, 0.95, round(q, 10), 0.03, 0.52)
                    .pop();
                iron();
                for (const y of [0.12, 0.8])
                    g.push(0, topY + y, m.z - fore)
                        .cyl(0.455 + y * 0.085, 0.05, round(q, 10), 0.005)
                        .pop();
            }
        }
        // the cap that holds the topmast to the masthead
        if (q > 0)
            k.wood(k.wale, 0.75)
                .push(0, capY - 0.07, m.z - fore * 0.5)
                .box(r * 0.72, 0.075, fore * 0.5 + r * 0.72, 0.02)
                .pop();
        // crosstrees at the head of the topmast, on a mast tall enough to carry a third sail
        const upper = m.sails.length > 2 ? d + m.sails[1][0] + m.h * 0.04 : 0;
        if (upper && q > 0) {
            k.wood(k.wale, 0.75);
            for (const dz of [-0.22, 0.22])
                g.push(0, upper, m.z - fore + dz)
                    .box(R * 0.55, 0.035, 0.04, 0.01)
                    .pop();
        }

        // ---- her yards ----
        m.sails.forEach(([y, w, h], i) => {
            const yz = i ? m.z - fore - rt - 0.1 : m.z - r - 0.12,
                thick = 0.1 + w * 0.005;
            // a yard is stoutest at the slings and tapers to each arm
            k.wood(k.spar, 0.7);
            for (const s of [-1, 1]) g.strut([0, d + y, yz], [s * (w / 2 + 0.45), d + y, yz], thick, thick * 0.52, round(q, 6));
            sails.push({ y: d + y - 0.1, z: yz - 0.02, w, h });
            if (q > 0) {
                // the parrel that holds it to the mast, and a cleat at each arm for the earings
                k.tarred()
                    .push(0, d + y - 0.08, i ? m.z - fore : m.z)
                    .cyl((i ? rt * 0.85 : r * 0.9) + 0.035, 0.16, round(q, 8), 0.03)
                    .pop();
                k.wood(k.wale, 0.7);
                for (const s of [-1, 1])
                    g.push(s * (w / 2 + 0.18), d + y, yz)
                        .box(0.03, thick * 0.75, thick * 0.75, 0.01)
                        .pop();
            }
            if (q > 2) {
                // gaskets round the yard, a turn of line every yard of it, ready to furl with
                k.hemp();
                for (let x = 0.7; x < w / 2; x += 1) for (const s of [-1, 1]) g.strut([s * x - 0.03, d + y, yz], [s * x + 0.03, d + y, yz], thick * (1 - (0.48 * x) / (w / 2 + 0.45)) + 0.012, thick * (1 - (0.48 * x) / (w / 2 + 0.45)) + 0.012, 6);
                // and on her lowest yard, a boom along each arm to set a studding sail from, in a pair of iron hoops
                if (!i) {
                    for (const s of [-1, 1]) {
                        k.wood(k.spar, 0.7).strut([s * w * 0.2, d + y + thick + 0.05, yz - 0.05], [s * (w / 2 + 1.1), d + y + thick * 0.6 + 0.05, yz - 0.05], 0.05, 0.035, 5);
                        iron();
                        for (const f of [0.3, 0.47]) g.strut([s * w * f - 0.02, d + y + thick * 0.9, yz - 0.03], [s * w * f + 0.02, d + y + thick * 0.9, yz - 0.03], 0.085, 0.085, 6);
                    }
                }
            }
            if (q > 1) {
                // footropes: what the hands stand on to hand the sail, hung under the yard in stirrups
                k.tarred();
                for (const s of [-1, 1]) {
                    const pts: Point[] = [0.06, 0.36, 0.68, 1].map((f) => [s * (0.3 + (w / 2 - 0.1) * f), d + y - (f > 0.05 && f < 0.95 ? 0.62 : 0.12), yz + 0.1]);
                    for (let j = 0; j + 1 < pts.length; j++) g.strut(pts[j], pts[j + 1], 0.016, 0.016, 3);
                    for (const p of [pts[1], pts[2]]) g.strut(p, [p[0], d + y, yz + 0.05], 0.012, 0.012, 3);
                }
            }
        });
        if (fine) {
            // gilded bands at the partners and under the top, and a gold truck at the masthead
            k.gilt()
                .push(0, d + 1.5, m.z)
                .cyl(r * 0.94 + 0.04, 0.16, round(q, 8), 0.01)
                .pop();
            g.push(0, topY - 0.36, m.z)
                .cyl(r * 0.8 + 0.05, 0.16, round(q, 8), 0.01)
                .pop();
            g.push(0, head[1] + 0.12, m.z - fore)
                .sphere(0.18, round(q, 8), 5)
                .pop();
        } else if (q > 0)
            k.wood(k.wale, 0.7)
                .push(0, head[1], m.z - fore)
                .cyl(0.16, 0.07, round(q, 7), 0.02)
                .pop();

        // ---- standing rigging: shrouds from her chains up to the top, set up with deadeyes and lanyards ----
        k.tarred();
        const offs = grand ? (q > 1 ? [-2, -0.7, 0.7, 2] : [-2, 0, 2]) : q > 1 ? [-1.6, 0.2, 1.9] : [-1.6, 1.9];
        for (const s of [-1, 1]) {
            const feet = offs.map((o) => plan.brink(k.tAt(m.z + o), s)),
                top: Point = [s * 0.12, topY - 0.12, m.z - fore * 0.5],
                // each shroud starts at the upper of its pair of deadeyes
                from = feet.map((f) => {
                    const l = Math.hypot(top[0] - f[0], top[1] - f[1], top[2] - f[2]);
                    return lerp3(f, top, 0.78 / l);
                });
            feet.forEach((f, i) => {
                g.strut(q > 0 ? from[i] : f, top, 0.035, 0.035, round(q, 4));
                if (q < 1) return;
                // deadeyes: a pair of round blocks, the lower strapped to her side and the upper turned into the shroud
                k.wood(k.wale, 0.6);
                for (const p of [lerp3(f, from[i], 0.2), from[i]])
                    g.push(p[0] - s * 0.035, p[1], p[2], 0, 0, Math.PI / 2)
                        .cyl(0.095, 0.07, round(q, 7), 0.015)
                        .pop();
                k.tarred();
                if (q > 1) for (const dz of [-0.05, 0, 0.05]) g.strut([f[0] + (from[i][0] - f[0]) * 0.2, f[1] + (from[i][1] - f[1]) * 0.2, f[2] + (from[i][2] - f[2]) * 0.2 + dz], [from[i][0], from[i][1], from[i][2] + dz], 0.01, 0.01, 3);
            });
            // ratlines to climb them by: on the grandest hulls always, on any hull given the detail
            if (grand > 1 || q > 1) {
                const a = from[0],
                    b = from[from.length - 1],
                    len = Math.hypot(top[0] - a[0], top[1] - a[1], top[2] - a[2]),
                    n = Math.floor((len * 0.9) / (q > 1 ? 0.42 : q ? 0.8 : 1.6));
                for (let j = 1; j <= n; j++) g.strut(lerp3(a, top, (j / (n + 1)) * 0.92), lerp3(b, top, (j / (n + 1)) * 0.92), 0.014, 0.014, 3);
            }
            if (q > 0) {
                // futtock shrouds under the top, and the topmast's own shrouds from its rim up to the hounds
                const hounds: Point = [s * 0.08, upper ? upper : head[1] - m.h * 0.08, m.z - fore];
                for (const dz of grand ? [-0.45, 0.35] : [0.05]) {
                    const rim: Point = [s * (R - 0.04), topY, m.z - fore * 0.5 + dz * R];
                    if (grand) g.strut(rim, [s * r * 0.8, topY - 1.5, m.z + dz * 0.2], 0.022, 0.022, 3);
                    g.strut(rim, hounds, 0.024, 0.024, 3);
                }
                if (q > 2 && grand) {
                    // and ratlines on those too
                    const a: Point = [s * (R - 0.04), topY, m.z - fore * 0.5 - 0.45 * R],
                        b: Point = [s * (R - 0.04), topY, m.z - fore * 0.5 + 0.35 * R];
                    for (let j = 1; j < 9; j++) g.strut(lerp3(a, hounds, j / 10), lerp3(b, hounds, j / 10), 0.011, 0.011, 3);
                }
            }
            // running rigging to every yard: a lift from the mast above it, and a brace led aft and down to her side
            m.sails.forEach(([y, w], i) => {
                const yz = i ? m.z - fore - rt - 0.1 : m.z - r - 0.12,
                    arm: Point = [s * (w / 2 + 0.4), d + y + 0.04, yz],
                    foot = plan.brink(k.tAt(Math.min(m.z + w * 0.8, zs - 0.2)), s);
                g.strut([0, Math.min(head[1], d + y + 1 + w * 0.16), (i ? m.z - fore : m.z) - 0.1], arm, 0.018, 0.018, 3);
                g.strut(arm, foot, 0.018, 0.018, 3);
                if (q > 1) {
                    block([arm[0], arm[1] - 0.08, arm[2] + 0.06], 0.075);
                    block(lerp3(foot, arm, 0.035), 0.08);
                }
            });
            // a backstay from each masthead; and on a finished hull another from the head of the topmast
            if (grand || q > 0) g.strut(head, plan.brink(k.tAt(Math.min(m.z + 3.4 + m.h * 0.04, zs - 0.5)), s), 0.03, 0.03, round(q, 4));
            if (grand && upper && q > 0) g.strut([0, upper, m.z - fore], plan.brink(k.tAt(Math.min(m.z + 2.6, zs - 0.5)), s), 0.024, 0.024, 3);
            // where her shrouds come down to the open rail: a channel to spread them, and iron chainplates under it
            if (plan.open(t, s) && offs.every((o) => plan.open(k.tAt(m.z + o), s))) {
                const span = offs[offs.length - 1] - offs[0];
                k.wood(k.wale, 0.7)
                    .push(...(k.on(t, k.gAt(t) - 0.08, s, 0.16) as [number, number, number]))
                    .box(0.17, 0.035, span / 2 + 0.3, 0.02)
                    .pop();
                iron();
                for (const o of offs) g.strut(k.on(k.tAt(m.z + o), k.gAt(t) - 0.1, s, 0.28), k.on(k.tAt(m.z + o), k.gAt(t) - 0.85, s, 0.03), 0.028, 0.028, 4);
                k.tarred();
            }
        }
        // the halyard her colours go up by, from the truck down to a cleat on the mast
        if (q > 1) k.hemp().strut([0.1, head[1], m.z - fore], [r * 0.9, d + 1.3, m.z + 0.1], 0.009, 0.009, 3);
        heads.push([0, head[1], m.z - fore]);
        tops.push([0, topY, m.z - fore * 0.5]);
        lamps.push([0, d + 2.25, m.z + r + 0.22]);
    }

    // the tallest masthead flies the flag; on a finished hull the others fly streamers
    const flag = heads.reduce((a, b) => (b[1] > a[1] ? b : a)),
        pennants = grand ? heads.filter((h) => h !== flag) : [];

    // ---- the bowsprit, and the stays that come down to it ----
    const sprit: Point = [0, k.gAt(1) + L * 0.085, -L / 2 - L * 0.21],
        foreMast = plan.masts[0],
        foreD = k.dAt(k.tAt(foreMast.z)),
        foreHead = heads[0],
        foreTop = tops[0],
        spritFoot = k.pt(0.93, 0, k.gAt(0.93) - 0.1),
        stem = k.pt(1, 0, k.gAt(1));
    k.wood(k.spar, 0.7).strut(spritFoot, sprit, 0.19, 0.09, round(q, 6));
    if (q > 0) {
        // the gammoning that lashes it down to her stem, and a cap on its end
        const at = lerp3(spritFoot, sprit, 0.24);
        k.hemp();
        for (let i = 0; i < 4; i++) g.strut([0.11, at[1] + 0.12, at[2] - i * 0.09], [0, stem[1] - 0.9, stem[2] + 0.1 - i * 0.05], 0.025, 0.025, 3);
        for (let i = 0; i < 4; i++) g.strut([-0.11, at[1] + 0.12, at[2] - i * 0.09], [0, stem[1] - 0.9, stem[2] + 0.1 - i * 0.05], 0.025, 0.025, 3);
        k.wood(k.wale, 0.7)
            .push(sprit[0], sprit[1], sprit[2])
            .sphere(0.12, round(q, 6), 4)
            .pop();
    }
    k.tarred();
    g.strut(foreHead, sprit, 0.03, 0.03, round(q, 4));
    g.strut(foreTop, [sprit[0], sprit[1] * 0.8, sprit[2] * 0.86], 0.03, 0.03, round(q, 4));
    if (q > 0) {
        // the bobstay, holding it down against the pull of all that: from its end to her cutwater at the waterline
        const cut = k.pt(1, 0, 0.5);
        g.strut(lerp3(spritFoot, sprit, 0.9), [0, cut[1], cut[2] - 0.15], 0.035, 0.035, round(q, 4));
        // and a shroud either side of it, to her bows
        for (const s of [-1, 1]) g.strut(lerp3(spritFoot, sprit, 0.9), k.on(0.86, k.gAt(0.86) * 0.7, s, 0.03), 0.024, 0.024, 3);
    }
    if (grand > 1 && q > 0) {
        // a spritsail yard slung under it, its sail rolled up along it
        const at = lerp3(spritFoot, sprit, 0.62),
            w = k.B * 0.52;
        k.wood(k.spar, 0.7);
        for (const s of [-1, 1]) g.strut([0, at[1] - 0.28, at[2]], [s * w, at[1] - 0.28, at[2]], 0.11, 0.06, round(q, 6));
        k.plain(CANVAS, 0.95);
        for (const s of [-1, 1]) g.strut([0, at[1] - 0.12, at[2] - 0.05], [s * (w - 0.3), at[1] - 0.14, at[2] - 0.05], 0.12, 0.08, round(q, 6));
        k.tarred();
        for (const s of [-1, 1]) g.strut([s * w, at[1] - 0.28, at[2]], lerp3(spritFoot, sprit, 0.96), 0.016, 0.016, 3);
    }
    // from each mast to the next: masthead to masthead, and a stay from every top down to the foot of the mast before it
    for (let i = 1; i < plan.masts.length; i++) {
        const a = plan.masts[i - 1];
        g.strut(heads[i - 1], heads[i], 0.03, 0.03, round(q, 4));
        if (q > 0) g.strut(tops[i], [0, k.dAt(k.tAt(a.z)) + 1.5, a.z + 0.6 + a.h * 0.012], 0.034, 0.034, round(q, 4));
    }

    // ---- fore-and-aft canvas on a finished hull: jibs on the stays forward, and a driver on a boom
    // from her last mast, sheeted out over the stern ----
    const jibs: JibSlot[] = [];
    if (grand) {
        jibs.push({ tack: lerp3(spritFoot, sprit, 0.96), head: lerp3(sprit, foreHead, 0.8), clew: [0, foreD + 2.9, foreMast.z - 3.6] });
        if (grand > 1) jibs.push({ tack: lerp3(spritFoot, sprit, 0.52), head: lerp3(sprit, foreTop, 0.84), clew: [0, foreD + 2.6, foreMast.z - 2.7] });
        const m = plan.masts[plan.masts.length - 1],
            d = k.dAt(k.tAt(m.z)),
            r = 0.17 + m.h * 0.0075,
            tack: Point = [0, Math.max(d + 2.9, plan.sternTop + 1.6), m.z + r + 0.25],
            // the boom stops short of the taffrail and its lanterns
            clew: Point = [0, tack[1] + 0.3, Math.min(m.z + L * 0.3, plan.sternZ(plan.sternTop) - 1.6)];
        jibs.push({ tack, head: [0, Math.max(d + m.h * 0.6, tack[1] + 3.6), m.z + r + 0.25], clew });
        k.wood(k.spar, 0.7).strut([0, tack[1] - 0.14, m.z + r], [0, clew[1] - 0.14, clew[2] + 0.4], 0.13, 0.085, round(q, 6));
        if (q > 0) {
            // the jaws it swings on, and the sheet that holds it down to her taffrail
            k.wood(k.wale, 0.7)
                .push(0, tack[1] - 0.14, m.z + r * 0.5)
                .box(r + 0.07, 0.07, 0.16, 0.03)
                .pop();
            k.hemp().strut([0, clew[1] - 0.2, clew[2]], [0, plan.sternTop + 0.1, plan.sternZ(plan.sternTop) - 0.3], 0.018, 0.018, 3);
        }
    }
    return { sails, jibs, flag, pennants, feet: lamps };
}
