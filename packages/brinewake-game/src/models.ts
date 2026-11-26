import { Geo, gridNormals, MATERIAL, type Mesh, type Point, registerMesh } from '@ryqndev/brinewake-renderer';
import { clamp, m4, m4aim, PI, smooth } from '@ryqndev/kiln-math';

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

/** A hull's mesh and the measurements the simulation needs from it. Bow at -Z, waterline at y = 0. */
export interface HullModel {
    mesh: Mesh;
    len: number;
    beam: number;
    draft: number;
    /** deck height amidships */
    deck: number;
    sails: SailSlot[];
    jibs: JibSlot[];
    /** mastheads that fly a streamer, on the hulls grand enough for them */
    pennants: Point[];
    /** guns per side, and each one's muzzle on the starboard side (mirror x for port) */
    guns: number;
    muzzles: Point[];
    /** masthead the flag flies from, and the height markers float at */
    flag: Point;
    lantern: Point;
}

export type ModelName = 'sail' | 'jib' | 'flag' | 'ball' | 'crate' | 'barrel' | 'plank';

/** The three hulls as launched, smallest first: sloop, brig, galleon. Filled in by buildModels(). */
export const HULLS: HullModel[] = [];
/** Every other instanced mesh in the game. */
export const M = {} as Record<ModelName, Mesh>;

interface MastSpec {
    z: number;
    h: number;
    /** per sail: yard height above the deck, width, drop */
    sails: number[][];
}
interface HullSpec {
    len: number;
    beam: number;
    draft: number;
    /** freeboard amidships */
    free: number;
    guns: number;
    /** storeys of cabin at the stern as launched, before any living quarters are added */
    cabin: number;
    /**
     * How richly she is finished: 0 a plain working hull; 1 painted and gilded, with stern windows,
     * a figurehead and fore-and-aft sails; 2 a floating palace, with a stern gallery, quarter
     * galleries, a forecastle and gold wherever it will go. It also lifts her sheer at bow and stern.
     */
    grand: number;
    masts: MastSpec[];
    /** strapped and belted with iron: only hulls built to the lines that call for it */
    iron?: boolean;
}

const SPECS: HullSpec[] = [
    { len: 17, beam: 5.4, draft: 1.9, free: 1.9, guns: 3, cabin: 0, grand: 0, masts: [{ z: -0.8, h: 16, sails: [[9.2, 9.2, 7.2], [14.8, 6.6, 5.2]] }] },
    {
        len: 25, beam: 7, draft: 2.5, free: 2.4, guns: 5, cabin: 1, grand: 1,
        masts: [
            { z: -5.2, h: 20.5, sails: [[10, 10.5, 7.8], [16.4, 7.6, 6], [19.8, 5.4, 3.1]] },
            { z: 4.4, h: 23, sails: [[11, 11.5, 8.6], [18.4, 8.4, 7], [22.1, 6, 3.4]] },
        ],
    },
    {
        len: 34, beam: 9, draft: 3.2, free: 3, guns: 8, cabin: 2, grand: 2,
        masts: [
            { z: -9.5, h: 24.5, sails: [[11.5, 12, 9], [18.6, 9, 6.8], [23.2, 6.4, 4.2]] },
            { z: 1, h: 30.5, sails: [[12.5, 14, 10], [20.6, 10.5, 7.6], [25.4, 7.4, 4.6], [29.4, 5, 3.6]] },
            // the mizzen carries a topsail over her driver, in place of a square course
            { z: 10.5, h: 20, sails: [[17.8, 6.6, 5]] },
        ],
    },
];

/**
 * The lines a hull is built to: how the yard's own draught is pulled about to suit a purpose. The
 * yard sells them as builds (the 'lines' fittings, which say what each does to her figures); here
 * is only what they do to her shape. Each number multiplies the hull's own.
 */
interface Lines {
    beam: number;
    free: number;
    draft: number;
    /** the height of her masts and yards, and how far her yards spread */
    rig: number;
    canvas: number;
    /** guns in a battery, from what the hull was drawn with */
    guns(n: number): number;
    iron?: boolean;
}
/** By the index a fitting's `form` gives. The first is the hull as drawn. */
const LINES: Lines[] = [
    { beam: 1, free: 1, draft: 1, rig: 1, canvas: 1, guns: (n) => n },
    // corsair: fined down, low in the water and over-sparred, with a gun landed from each battery
    { beam: 0.88, free: 0.88, draft: 0.92, rig: 1.13, canvas: 1.08, guns: (n) => Math.max(2, n - 1) },
    // bombard: broad in the beam for a quarter more guns, under a rig cut down to carry them
    { beam: 1.1, free: 1.06, draft: 1.06, rig: 0.9, canvas: 1, guns: (n) => Math.round(n * 1.25) },
    // ironside: high sides and deep, belted with iron
    { beam: 1.08, free: 1.13, draft: 1.1, rig: 0.96, canvas: 1, guns: (n) => n, iron: true },
    // smuggler: full-bellied and deep, all hold
    { beam: 1.15, free: 1.1, draft: 1.2, rig: 0.97, canvas: 1, guns: (n) => n },
];
// a hull's draught, redrawn to other lines
function drawn(spec: HullSpec, form: number): HullSpec {
    const l = LINES[form];
    if (!l || !form) return spec;
    return {
        ...spec,
        beam: spec.beam * l.beam,
        free: spec.free * l.free,
        draft: spec.draft * l.draft,
        guns: l.guns(spec.guns),
        iron: l.iron,
        masts: spec.masts.map((m) => ({ z: m.z, h: m.h * l.rig, sails: m.sails.map(([y, w, drop]) => [y * l.rig, w * l.canvas, drop * l.rig]) })),
    };
}

/** How much a gun deck raises the hull, metres. */
const DECK_RISE = 1.25;

/**
 * Guns in each battery of a hull with `decks` gun decks added, built to the lines `form`. Known
 * before any mesh is built.
 */
export function gunsASide(hull: number, decks = 0, form = 0) {
    const guns = (LINES[form] ?? LINES[0]).guns(SPECS[hull].guns);
    return guns + decks * Math.ceil(guns / 2);
}

/**
 * A finish: what a hull is built of and how it is trimmed. It changes nothing about her shape, so
 * any hull can wear any finish. The yard sells them as skins (see the 'finish' fittings).
 */
interface Finish {
    /** below the waterline, her planking, her decks, her spars, and the joinery of her cabins */
    tar: number[];
    /** timber that stands proud of her planking: wales, fenders, port frames, the rudder */
    wale: number[];
    plank: number[];
    deck: number[];
    spar: number[];
    cabin: number[];
    /** gilded mouldings, rails and window frames, on however plain a hull */
    trim: boolean;
}

/** The finishes a hull can wear, by the index a fitting's `skin` gives. The first is bare timber. */
const SKINS: Finish[] = [
    { tar: [0.17, 0.14, 0.12], wale: [0.17, 0.14, 0.12], plank: [0.4, 0.27, 0.16], deck: [0.47, 0.39, 0.29], spar: [0.4, 0.28, 0.17], cabin: [0.35, 0.23, 0.14], trim: false },
    // black and gold: ebony above the water and copper below it, gilt wherever there is an edge
    { tar: [0.56, 0.36, 0.22], wale: [0.085, 0.08, 0.085], plank: [0.125, 0.115, 0.12], deck: [0.25, 0.2, 0.17], spar: [0.13, 0.115, 0.11], cabin: [0.105, 0.098, 0.1], trim: true },
];

const built = new Map<number, HullModel>();
/**
 * A hull (an index into HULLS) with works added: gun decks, each raising her by a deck with a
 * lower tier of guns, and storeys of living quarters at the stern; in one of the finishes, and
 * built to one of the LINES. Built the first time it is asked for, so only the ships players
 * actually make cost anything.
 */
export function hullModel(hull: number, decks = 0, quarters = 0, skin = 0, form = 0): HullModel {
    const key = hull + 8 * decks + 64 * quarters + 512 * skin + 4096 * form;
    let model = built.get(key);
    if (!model) built.set(key, (model = buildHull(drawn(SPECS[hull], form), decks, quarters, SKINS[skin] ?? SKINS[0])));
    return model;
}

const RIG = [0.1, 0.09, 0.08],
    IRON = [0.11, 0.11, 0.12],
    GRATING = [0.2, 0.15, 0.1],
    GOLD = [1, 0.74, 0.24];

const HEMP = [0.3, 0.245, 0.16],
    GUNMETAL = [0.19, 0.19, 0.205];

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
    BORE = turned([[0.072, GUN_LEN], [0.072, 1.74], [0, 1.74]]);
/** How far inboard of her side a gun's breech face stands, run out. */
const GUN_IN = 1.35;

const lerp3 = (a: Point, b: Point, f: number): Point => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];

function buildHull(spec: HullSpec, decks: number, quarters: number, finish: Finish): HullModel {
    const { len: L, beam: B, draft: D, grand } = spec,
        { tar: TAR, wale: WALE, plank: PLANK, deck: DECK, spar: SPAR, cabin: CABIN } = finish,
        // gilded: because she was built grand, or because her finish gilds whatever it is put on
        fine = grand > 0 || finish.trim,
        F = spec.free + decks * DECK_RISE;
    const g = new Geo();
    const wood = (c: number[], rough = 0.8) => g.mat(rough, 0, 0, MATERIAL.WOOD).col(c[0], c[1], c[2]);
    const gilt = () => g.mat(0.28, 0.95, 0, MATERIAL.METAL).col(GOLD[0], GOLD[1], GOLD[2]);
    // painted work takes the ship's colours
    const paint = () => g.mat(0.6, 0, 0, MATERIAL.PAINT).col(1, 1, 1);
    const tarred = () => g.mat(0.9, 0, 0, MATERIAL.PAINT).col(RIG[0], RIG[1], RIG[2]);
    const lamp = (r: number, gr: number, b: number, e: number) => g.mat(0.3, 0, e, MATERIAL.EMISSIVE).col(r, gr, b);
    // t runs 0 at the stern to 1 at the bow
    const zAt = (t: number) => L / 2 - t * L;
    const tAt = (z: number) => (L / 2 - z) / L;
    const wAt = (t: number) => Math.max(0.05, (B / 2) * Math.min(1, 0.72 + 1.3 * t) * (1 - Math.pow(Math.max(0, (t - 0.4) / 0.6), 2.4)));
    // gunwale: sweeping up to the stern and at the bow, a little more on a grander hull. Most of her
    // height aft comes from the decks built up on this rail, not from the rail itself.
    const gAt = (t: number) => F + B * 0.2 * smooth(0.36, 0, t) * (0.45 + 0.15 * grand) + F * (0.4 + 0.2 * grand) * t * t * t;
    const kAt = (t: number) => -D * (1 - 0.6 * t ** 3 - 0.2 * (1 - t) ** 4);
    const dAt = (t: number) => gAt(t) - 0.8;
    const inAt = (t: number) => Math.max(0.02, wAt(t) * 0.97 - 0.16);
    // the stem rakes forward as it rises
    // Her stern does not stand straight up from the sternpost. From the waterline it sweeps aft in a
    // counter as far as the top of the wale, and from there rakes steadily to the taffrail, so her
    // upper decks overhang the rudder: the grander the hull, the longer the counter and the more rake.
    const rake = 0.12 + 0.05 * grand,
        waleTop = gAt(0) * 0.55,
        counter = L * 0.035 * (1 + 0.5 * grand) + rake * (waleTop - 0.3);
    // how far aft of the sternpost her stern stands at a height
    const aft = (y: number) => (y <= 0.3 ? 0 : y < waleTop ? (counter * (y - 0.3)) / (waleTop - 0.3) : counter + rake * (y - waleTop));
    // where her stern face is at a height, and how far it leans back there (for whatever is set flat against it)
    const sternZ = (y: number) => L / 2 + aft(y),
        lean = (y: number) => Math.atan((aft(y + 0.05) - aft(y - 0.05)) / 0.1);
    // a point of the hull: the stem rakes forward as it rises, and her quarters run aft to meet the stern
    const pt = (t: number, x: number, y: number): Point => [x, y, zAt(t) - L * 0.07 * smooth(0.72, 1, t) * clamp((y - kAt(t)) / (gAt(t) - kAt(t)), 0, 1) + aft(y) * smooth(0.14, 0, t)];

    // ---- shell: keel, bilge, waterline, wale, gunwale at each station; starboard, then mirrored.
    // A finished hull has one more strake under the gunwale, painted like the wale. ----
    const NS = 14;
    const star: Point[][] = [];
    for (let i = 0; i <= NS; i++) {
        const t = i / NS,
            w = wAt(t),
            k = kAt(t),
            gy = gAt(t),
            row = [pt(t, 0, k), pt(t, w * 0.55, k * 0.82), pt(t, w * 0.9, k * 0.3), pt(t, w, 0.3), pt(t, w * 1.03, gy * 0.55)];
        if (grand) row.push(pt(t, w, gy * 0.82));
        row.push(pt(t, w * 0.97, gy));
        star.push(row);
    }
    const TOP = star[0].length - 1;
    const starN = gridNormals(star, () => [1, -0.35, 0]);
    const mirror = (p: Point): Point => [-p[0], p[1], p[2]];
    for (const [P, N] of [[star, starN], [star.map((r) => r.map(mirror)), starN.map((r) => r.map(mirror))]]) {
        wood(TAR, 0.7).skin(P, N, 0, 3);
        paint().skin(P, N, 3, 4);
        wood(PLANK).skin(P, N, 4, 5);
        if (grand) paint().skin(P, N, 5, 6);
    }
    // transom, closing the stern: tarred, painted and planked in the same bands as her sides
    for (let j = 0; j < TOP; j++) {
        if (j < 3) wood(TAR, 0.7);
        else if (j === 3 || j === 5) paint();
        else wood(PLANK);
        g.flat([star[0][j], star[0][j + 1], mirror(star[0][j + 1]), mirror(star[0][j])], 0, 0, 0);
    }
    // gilded mouldings run the length of her, along every seam between paint and plank
    if (fine) {
        gilt();
        const r = 0.04 + 0.02 * grand;
        for (const row of grand > 1 ? [4, 5, TOP] : grand ? [5, TOP] : [4, TOP]) {
            for (let i = 0; i < NS; i++)
                for (const s of [-1, 1]) {
                    const a = star[i][row],
                        b = star[i + 1][row];
                    g.strut([s * (a[0] + 0.03), a[1], a[2]], [s * (b[0] + 0.03), b[1], b[2]], r, r, 5);
                }
            // and on across the transom
            if (row !== TOP) g.strut([-star[0][row][0], star[0][row][1], L / 2 + 0.02], [star[0][row][0], star[0][row][1], L / 2 + 0.02], r, r, 5);
        }
    }

    // ---- deck, the inside of the bulwarks and the rail capping them ----
    let prev: number[] | null = null;
    for (let i = 0; i <= NS; i++) {
        const t = i / NS,
            w = inAt(t),
            o = wAt(t) * 0.97,
            d = dAt(t),
            gy = gAt(t),
            row: number[] = [];
        wood(DECK, 0.9);
        for (const s of [-1, 1]) row.push(g.vert(...(pt(t, s * w, d) as [number, number, number]), 0, 1, 0));
        wood(PLANK);
        for (const s of [-1, 1]) {
            row.push(g.vert(...(pt(t, s * w, d) as [number, number, number]), -s, 0, 0), g.vert(...(pt(t, s * w, gy) as [number, number, number]), -s, 0, 0));
            row.push(g.vert(...(pt(t, s * w, gy) as [number, number, number]), 0, 1, 0), g.vert(...(pt(t, s * o, gy) as [number, number, number]), 0, 1, 0));
        }
        if (prev) for (let k = 0; k < row.length; k += 2) g.quad(prev[k], prev[k + 1], row[k + 1], row[k]);
        prev = row;
    }
    g.flat([pt(0, -inAt(0), dAt(0)), pt(0, inAt(0), dAt(0)), pt(0, inAt(0), gAt(0)), pt(0, -inAt(0), gAt(0))], 0, 0, L);

    // ---- the upper works. Her side does not stop at the rail: aft it is carried up, in one sweep of
    // planking that leans in as it rises, to enclose a deck for the cabin she was launched with and one
    // more for every level of living quarters built, each shorter than the one below, so the stern
    // climbs in steps the way a galleon's does. Where a deck ends the bulwark sweeps down to the next
    // in a hance. A finished hull has a forecastle raised the same way at the bow. Every deck is open
    // to the sky, railed, and reached by ladders from the one below. ----
    const decksAft = spec.cabin + quarters,
        gy0 = gAt(0),
        w0 = wAt(0),
        zs = L / 2,
        // how far forward the sterncastle reaches: further for every deck it carries
        T0 = decksAft ? Math.min(0.44, 0.2 + 0.04 * grand + 0.03 * (decksAft - 1)) : 0,
        // solid bulwark standing above each raised deck, under its rail
        WALL = 0.42,
        // how far along her length a bulwark takes to sweep down where its deck ends
        HANCE = 0.024,
        // where the forecastle begins, and the height of its deck
        TF = 0.8,
        fcY = gAt(TF) + 0.35 + 0.3 * grand;
    const reach = (k: number) => T0 * (1 - (0.8 * k) / decksAft);
    // each deck is level: the lowest gives standing room over the waist where it ends, the rest climb from it
    const roofY: number[] = [];
    for (let k = 0; k < decksAft; k++) roofY.push(k ? roofY[k - 1] + 1.3 : gAt(T0) + 1.15);
    // the highest deck of the sterncastle over a station, or -1 forward of it
    const over = (t: number) => {
        let k = -1;
        while (k + 1 < decksAft && reach(k + 1) >= t) k++;
        return k;
    };
    // the top of her side at a station: the rail, or the bulwark of whatever deck is raised there
    const topY = (t: number) => {
        const rail = gAt(t);
        let y = rail;
        for (let k = 0; k < decksAft; k++) y = Math.max(y, rail + (roofY[k] + WALL - rail) * smooth(reach(k) + HANCE, reach(k), t));
        if (grand) y = Math.max(y, rail + Math.max(0, fcY + WALL - rail) * smooth(TF - HANCE, TF, t));
        return y;
    };
    // how far out her side stands at a height: it leans in above the rail
    const sideX = (t: number, y: number) => wAt(t) * (0.97 - 0.028 * Math.max(0, y - gAt(t)));
    const sternTop = topY(0);
    const brink = (t: number, s: number): Point => pt(t, s * sideX(t, topY(t)), topY(t));
    // the deck under foot at a station
    const floorY = (t: number) => {
        const k = over(t);
        return k >= 0 ? roofY[k] : grand && t >= TF ? fcY : dAt(t);
    };
    // a lit window facing along (nx, nz), in a gilded frame on a finished hull
    // (`tilt` leans it back with the face it is set in)
    const light = (x: number, y: number, z: number, half: number, hh: number, nx: number, nz: number, tilt = 0) => {
        const hx = nz ? half : 0.03,
            hz = nz ? 0.03 : half;
        if (fine) gilt().push(x + nx * 0.02, y, z + nz * 0.02, 0, tilt).box(hx + (nz ? 0.07 : 0), hh + 0.07, hz + (nx ? 0.07 : 0), 0.01).pop();
        lamp(1, 0.74, 0.4, 0.45).push(x + nx * 0.05, y, z + nz * 0.05, 0, tilt).box(hx, hh, hz, 0.01).pop();
    };
    // a balustrade along a run of points: turned posts under a handrail, gilded as the hull allows
    const fence = (run: Point[]) => {
        for (let k = 0; k < run.length - 1; k++) {
            const a = run[k],
                b = run[k + 1],
                n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.55));
            if (grand > 1 || finish.trim) gilt();
            else wood(SPAR, 0.7);
            for (let i = 0; i <= (k === run.length - 2 ? n : n - 1); i++) {
                const p = lerp3(a, b, i / n);
                g.push(p[0], p[1], p[2]).cyl(0.05, 0.56, 5, 0.01, 0.032).pop();
            }
            if (fine) gilt();
            g.strut([a[0], a[1] + 0.58, a[2]], [b[0], b[1] + 0.58, b[2]], 0.05, 0.05, 5);
        }
    };
    // her side from the rail up to its top between two stations: planked outboard in one fair
    // surface, lined inboard above whatever deck is under foot, and capped
    const raise = (ta: number, tb: number) => {
        const m = Math.max(2, Math.ceil((tb - ta) / 0.008)),
            at = (i: number) => ta + ((tb - ta) * i) / m,
            outer: Point[][] = [];
        for (let i = 0; i <= m; i++) {
            const t = at(i),
                lo = gAt(t),
                hi = topY(t),
                row: Point[] = [];
            for (let c = 0; c <= 3; c++) row.push(pt(t, sideX(t, lo + ((hi - lo) * c) / 3), lo + ((hi - lo) * c) / 3));
            outer.push(row);
        }
        const N = gridNormals(outer, () => [1, 0.1, 0]);
        wood(PLANK);
        g.skin(outer, N, 0, 3);
        g.skin(outer.map((r) => r.map(mirror)), N.map((r) => r.map(mirror)), 0, 3);
        const inner = (t: number, y: number, s: number) => pt(t, s * (sideX(t, y) - 0.13), y);
        for (let i = 0; i < m; i++) {
            const a = at(i),
                b = at(i + 1),
                ya = topY(a),
                yb = topY(b),
                fa = Math.min(ya, Math.max(gAt(a), floorY(a))),
                fb = Math.min(yb, Math.max(gAt(b), floorY(b)));
            if (ya - fa < 0.02 && yb - fb < 0.02) continue;
            for (const s of [-1, 1]) {
                g.flat([inner(a, fa, s), inner(b, fb, s), inner(b, yb, s), inner(a, ya, s)], s * 100, ya, zAt(a));
                g.flat([pt(a, s * sideX(a, ya), ya), pt(b, s * sideX(b, yb), yb), inner(b, yb, s), inner(a, ya, s)], 0, -50, 0);
            }
        }
    };
    // a deck laid between two stations at a height, from side to side
    const lay = (ta: number, tb: number, y: number) => {
        const m = Math.max(1, Math.ceil((tb - ta) / 0.03)),
            edge = (t: number, s: number) => pt(t, s * Math.max(0.03, sideX(t, y) - 0.13), y);
        wood(DECK, 0.9);
        for (let i = 0; i < m; i++) {
            const a = ta + ((tb - ta) * i) / m,
                b = ta + ((tb - ta) * (i + 1)) / m;
            g.flat([edge(a, -1), edge(a, 1), edge(b, 1), edge(b, -1)], 0, -50, 0);
        }
    };
    // a ladder from one deck up to the edge of the next: `away` is the way its foot stands off (+z aft)
    const ladder = (x: number, yb: number, yt: number, z: number, away: number) => {
        const foot: Point = [x, yb, z + away * (yt - yb) * 0.7],
            head: Point = [x, yt + 0.02, z + away * 0.05],
            steps = Math.max(2, Math.round((yt - yb) / 0.28));
        wood(SPAR, 0.7);
        for (const dx of [-0.3, 0.3]) g.strut([x + dx, foot[1], foot[2]], [x + dx, head[1], head[2]], 0.045, 0.045, 4);
        for (let i = 1; i < steps; i++) {
            const p = lerp3(foot, head, i / steps);
            g.push(p[0], p[1], p[2]).box(0.3, 0.025, 0.12, 0.01).pop();
        }
    };
    // the bulkhead where a raised deck ends: a door amidships with a light either side, a ladder up
    // on each hand, and the deck's rail along its top with a gap at the head of each ladder
    const bulkhead = (t: number, yb: number, yt: number, away: number) => {
        const z = pt(t, 0, yt)[2],
            wb = yb < gAt(t) ? inAt(t) : sideX(t, yb) - 0.13,
            wt = sideX(t, yt) - 0.13,
            h = yt - yb,
            xl = wt * 0.64;
        wood(CABIN).flat([[-wb, yb, z], [wb, yb, z], [wt, yt, z], [-wt, yt, z]], 0, yb, z - away * L);
        const dh = Math.min(0.8, h / 2 - 0.08);
        wood(GRATING, 0.9).push(0, yb + dh, z + away * 0.03).box(0.4, dh, 0.04, 0.02).pop();
        if (fine) gilt().push(0, yb + dh * 2 + 0.06, z + away * 0.04).box(0.5, 0.045, 0.05, 0.02).pop();
        if (h > 1.3) for (const s of [-1, 1]) light(s * wt * 0.33, yb + Math.min(1.1, h * 0.6), z, wt * 0.11, 0.2, 0, away);
        if (fine) gilt().strut([-wt, yt, z + away * 0.02], [wt, yt, z + away * 0.02], 0.05, 0.05, 5);
        for (const s of [-1, 1]) ladder(s * xl, yb, yt, z, away);
        fence([[-wt, yt, z], [-xl - 0.42, yt, z]]);
        fence([[-xl + 0.42, yt, z], [xl - 0.42, yt, z]]);
        fence([[xl + 0.42, yt, z], [wt, yt, z]]);
    };

    if (decksAft) {
        if (!grand) raise(0, T0 + HANCE);
        for (let k = 0; k < decksAft; k++) {
            lay(k + 1 < decksAft ? reach(k + 1) : 0, reach(k), roofY[k]);
            bulkhead(reach(k), k ? roofY[k - 1] : dAt(reach(0)), roofY[k], -1);
            // a moulding along her side at the level of each deck
            if (fine) gilt();
            else wood(WALE, 0.7);
            const m = Math.max(2, Math.ceil(reach(k) / 0.02));
            for (let i = 0; i < m; i++)
                for (const s of [-1, 1]) {
                    const a = (reach(k) * i) / m,
                        b = (reach(k) * (i + 1)) / m;
                    if (roofY[k] < gAt(a) + 0.05) continue;
                    g.strut(pt(a, s * (sideX(a, roofY[k]) + 0.02), roofY[k]), pt(b, s * (sideX(b, roofY[k]) + 0.02), roofY[k]), 0.05, 0.05, 5);
                }
        }
        // her stern face, carried up from the transom deck by deck, with a row of lights to each
        let lo = gy0;
        for (let k = 0; k <= decksAft; k++) {
            const hi = k < decksAft ? roofY[k] : sternTop;
            if (hi - lo < 0.05) continue;
            wood(CABIN).flat([[-sideX(0, lo), lo, sternZ(lo)], [sideX(0, lo), lo, sternZ(lo)], [sideX(0, hi), hi, sternZ(hi)], [-sideX(0, hi), hi, sternZ(hi)]], 0, lo, 0);
            if (k < decksAft && hi - lo >= 0.9) {
                const across = grand > 1 ? 2 : 1,
                    gap = (sideX(0, hi) * 0.76) / across;
                for (let i = -across; i <= across; i++) light(i * gap, (lo + hi) / 2, sternZ((lo + hi) / 2), gap * 0.36, Math.min(0.32, (hi - lo) / 2 - 0.14), 0, 1, lean((lo + hi) / 2));
                // a pilaster between each pair of lights, and one outside the last
                if (fine) for (let i = -across - 1; i <= across; i++) gilt().strut([(i + 0.5) * gap, lo + 0.06, sternZ(lo + 0.06) + 0.03], [(i + 0.5) * gap, hi - 0.06, sternZ(hi - 0.06) + 0.03], 0.04, 0.04, 5);
            }
            if (fine && k < decksAft) gilt().strut([-sideX(0, hi), hi, sternZ(hi) + 0.02], [sideX(0, hi), hi, sternZ(hi) + 0.02], 0.05, 0.05, 5);
            lo = hi;
        }
        // and the inside of the bulwark across her stern, seen from the highest deck
        const top = roofY[decksAft - 1],
            sx = sideX(0, sternTop) - 0.13;
        if (sternTop - top > 0.05) wood(PLANK).flat([[-sx, top, sternZ(top) - 0.13], [sx, top, sternZ(top) - 0.13], [sx, sternTop, sternZ(sternTop) - 0.13], [-sx, sternTop, sternZ(sternTop) - 0.13]], 0, top, zs + L);
        g.flat([[-sx, sternTop, sternZ(sternTop) - 0.13], [sx, sternTop, sternZ(sternTop) - 0.13], [sx, sternTop, sternZ(sternTop)], [-sx, sternTop, sternZ(sternTop)]], 0, -50, 0);
        if (!grand) fence([[-sx, sternTop, sternZ(sternTop) - 0.07], [sx, sternTop, sternZ(sternTop) - 0.07]]);
    }
    if (grand) {
        // a finished hull is raised and railed from end to end: sterncastle, waist and forecastle
        raise(0, 0.985);
        lay(TF, 0.975, fcY);
        bulkhead(TF, dAt(TF), fcY, 1);
    }
    // the rail along the top of her side: its whole length on a finished hull, round the sterncastle on a plain one
    const railEnd = grand ? 0.965 : decksAft ? T0 + HANCE : 0;
    if (railEnd)
        for (const s of [-1, 1]) {
            const run: Point[] = [],
                m = Math.ceil(railEnd / 0.02);
            for (let i = 0; i <= m; i++) {
                const t = (railEnd * i) / m,
                    y = topY(t);
                run.push(pt(t, s * (sideX(t, y) - 0.065), y));
            }
            fence(run);
        }

    // ---- her sides: what stands proud of the planking, so that a hull is more than a smooth shell.
    // Every ship has wales, a capped rail and a rudder. The better she was built, the more is worked
    // into her: fenders, a carved frieze, panelled and arcaded upper works. ----
    // how far out her side stands at a height, below the rail as well as above it
    const outX = (t: number, y: number) => {
        const w = wAt(t),
            gy = gAt(t);
        if (y >= gy) return sideX(t, y);
        const prof = [[kAt(t) * 0.3, w * 0.9], [0.3, w], [gy * 0.55, w * 1.03]];
        if (grand) prof.push([gy * 0.82, w]);
        prof.push([gy, w * 0.97]);
        for (let i = 1; i < prof.length; i++)
            if (y <= prof[i][0]) return prof[i - 1][1] + (prof[i][1] - prof[i - 1][1]) * clamp((y - prof[i - 1][0]) / (prof[i][0] - prof[i - 1][0]), 0, 1);
        return w * 0.97;
    };
    // a point on her side, stood off it by `out`
    const on = (t: number, y: number, s: number, out = 0): Point => pt(t, s * (outX(t, y) + out), y);
    // a line worked along both sides between two stations, at a height that may change along the way
    const run = (ta: number, tb: number, yOf: (t: number) => number, r: number, out = 0.02, step = 0.03) => {
        const m = Math.max(1, Math.ceil((tb - ta) / step));
        for (let i = 0; i < m; i++) {
            const a = ta + ((tb - ta) * i) / m,
                b = ta + ((tb - ta) * (i + 1)) / m;
            for (const s of [-1, 1]) g.strut(on(a, yOf(a), s, out), on(b, yOf(b), s, out), r, r, 5);
        }
    };
    // wales: stout strakes at the waterline and (where it is not a gilded moulding) at the top of her paint
    wood(WALE, 0.7);
    run(0, 0.985, () => 0.32, 0.075);
    if (grand === 1 || (!grand && !finish.trim)) run(0, 0.985, (t) => gAt(t) * 0.55, 0.07);
    if (grand) run(0, 0.985, (t) => 0.32 + (gAt(t) * 0.55 - 0.32) * 0.5, 0.05);
    if (!fine) {
        // a plain hull: a capping on her rail, and timberheads standing up through it
        wood(SPAR, 0.7);
        run(decksAft ? T0 + HANCE : 0, 0.985, gAt, 0.06, -0.04);
        for (let t = (decksAft ? T0 + HANCE : 0) + 0.04; t < 0.95; t += 1.5 / L) for (const s of [-1, 1]) g.push(...(on(t, gAt(t) + 0.1, s, -0.09) as [number, number, number])).box(0.07, 0.15, 0.07, 0.02).pop();
    }
    // where each gun of the upper tier stands along her length
    const gunT = (i: number) => 0.24 + ((i + 0.5) / spec.guns) * 0.46;
    if (spec.iron) {
        // ironsides: a belt of plate over the wale at her waterline and another under her ports, strapped
        // together up her side between every pair of guns, and a shod stem to meet whatever is in the way
        const belt = (t: number) => gAt(t) * 0.55;
        g.mat(0.45, 0.9, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
        run(0.01, 0.985, () => 0.34, 0.1, 0.035);
        run(0.01, 0.985, belt, 0.085, 0.035);
        for (let t = 0.05; t < 0.93; t += 1.3 / L) for (const s of [-1, 1]) g.strut(on(t, 0.3, s, 0.06), on(t, belt(t), s, 0.06), 0.06, 0.06, 5);
        for (let k = 0; k < 4; k++) g.strut(pt(1, 0, -0.4 + (gAt(1) * 0.6 * k) / 4), pt(1, 0, -0.4 + (gAt(1) * 0.6 * (k + 1)) / 4), 0.16, 0.16, 6);
    }
    if (grand) {
        // fenders: timbers up her side amidships, between the ports
        wood(WALE, 0.7);
        for (let i = 1; i < spec.guns; i++) {
            const t = (gunT(i - 1) + gunT(i)) / 2;
            if (t < 0.36 || t > 0.66) continue;
            for (const s of [-1, 1]) for (let k = 0; k < 4; k++) g.strut(on(t, 0.2 + ((gAt(t) - 0.26) * k) / 4, s, 0.05), on(t, 0.2 + ((gAt(t) - 0.26) * (k + 1)) / 4, s, 0.05), 0.065, 0.065, 5);
        }
        // the frieze along her painted upper strake: gilt bosses on a finished hull, and on the grandest
        // a running scroll with a pearl in every turn
        const mid = (t: number) => gAt(t) * 0.91,
            wave = 1.5 / L;
        gilt();
        if (grand > 1) run(0.02, 0.965, (t) => mid(t) + gAt(t) * 0.055 * Math.sin((t / wave) * 2 * PI), 0.035, 0.03, 0.0055);
        for (let t = 0.03; t < 0.96; t += grand > 1 ? wave : 1 / L) for (const s of [-1, 1]) g.push(...(on(t, mid(t), s, 0.03) as [number, number, number])).sphere(grand > 1 ? 0.06 : 0.075, 6, 4).pop();
        // her upper works, panelled: battens up the sterncastle's side, and on the grandest gilded
        // pilasters with an arch sprung between each pair
        const bay = (grand > 1 ? 1.15 : 1.5) / L,
            foot = (t: number) => gAt(t) + 0.08,
            head = (t: number) => topY(t) - 0.08;
        for (let t = 0.012; t < T0 - 0.01; t += bay) {
            if (head(t) - foot(t) < 0.7) continue;
            for (const s of [-1, 1]) {
                if (grand > 1) gilt();
                else wood(WALE, 0.7);
                g.strut(on(t, foot(t), s, 0.03), on(t, head(t), s, 0.03), 0.045, 0.045, 5);
                const next = t + bay;
                if (grand > 1 && next < T0 - 0.01 && head(next) - foot(next) >= 0.7) {
                    const m = t + bay / 2,
                        crown = on(m, Math.min(head(t), head(next)) - 0.05, s, 0.03);
                    g.strut(on(t, head(t) - 0.38, s, 0.03), crown, 0.03, 0.03, 4);
                    g.strut(crown, on(next, head(next) - 0.38, s, 0.03), 0.03, 0.03, 4);
                }
            }
        }
    }
    // the rudder, hung on her sternpost
    const rudderTop = gy0 * 0.4,
        rudderFoot = kAt(0);
    wood(WALE, 0.7).push(0, (rudderTop + rudderFoot) / 2, zs + 0.3).box(0.08, (rudderTop - rudderFoot) / 2, 0.3, 0.03).pop();
    if (grand > 1) gilt();
    else g.mat(0.5, 0.8, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
    for (const f of [0.25, 0.55, 0.85]) g.push(0, rudderFoot + (rudderTop - rudderFoot) * f, zs + 0.22).box(0.1, 0.035, 0.24, 0.01).pop();

    // ---- the stern: the face she shows to anyone she is running from ----
    const pane = (x: number, y: number, hw: number, hh: number) => light(x, y, sternZ(y), hw, hh, 0, 1, lean(y));
    // her name board, on the sweep of the counter under the lights
    const board = (y: number, half: number) => gilt().push(0, y, sternZ(y) + 0.03, 0, lean(y)).box(half, 0.07, 0.03, 0.01).pop();
    if (grand === 1) {
        for (let i = -1; i <= 1; i++) pane(i * w0 * 0.56, gy0 * 0.72, w0 * 0.2, 0.34);
        board(gy0 * 0.44, w0 * 0.62);
    }
    if (grand > 1) {
        for (let i = -2; i <= 2; i++) pane(i * w0 * 0.36, gy0 * 0.79, w0 * 0.13, 0.34);
        board(gy0 * 0.43, w0 * 0.55);
        // the stern gallery: a walk across the transom under her lights, on carved brackets
        const gy = gy0 * 0.6,
            gz = sternZ(gy),
            out = 1,
            hw = w0 * 0.98;
        wood(CABIN).push(0, gy, gz + out / 2).box(hw, 0.07, out / 2, 0.03).pop();
        for (const x of [-hw * 0.8, 0, hw * 0.8]) g.strut([x, gy - 0.75, sternZ(gy - 0.75)], [x, gy - 0.06, gz + out * 0.9], 0.09, 0.07, 5);
        gilt();
        const rail: Point[] = [
            [-hw, gy, gz + 0.06],
            [-hw, gy, gz + out],
            [hw, gy, gz + out],
            [hw, gy, gz + 0.06],
        ];
        for (let k = 0; k < 3; k++) {
            const a = rail[k],
                b = rail[k + 1],
                n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.42));
            for (let i = 0; i <= n; i++) {
                const p = lerp3(a, b, i / n);
                g.push(p[0], p[1] + 0.07, p[2]).cyl(0.04, 0.5, 5, 0.01, 0.028).pop();
            }
            g.strut([a[0], gy + 0.6, a[2]], [b[0], gy + 0.6, b[2]], 0.05, 0.05, 5);
            g.strut([a[0], gy + 0.02, a[2]], [b[0], gy + 0.02, b[2]], 0.05, 0.05, 5);
        }
        // quarter galleries: a glazed turret on each quarter, where the gallery turns the corner
        for (const s of [-1, 1]) {
            const x = s * (wAt(0.035) * 1.02 + 0.12),
                y = gy0 * 0.67,
                hh = gy0 * 0.17,
                z = sternZ(y) - 1.15;
            wood(CABIN).push(x, y, z).box(0.36, hh, 1.15, 0.1).pop();
            gilt().push(x, y + hh, z).box(0.42, 0.05, 1.21, 0.02).pop();
            g.push(x, y - hh, z).box(0.42, 0.05, 1.21, 0.02).pop();
            g.push(x, y + hh + 0.05, z).cyl(0.3, 0.42, 8, 0.02, 0.05).pop();
            lamp(1, 0.74, 0.4, 0.45);
            for (const dz of [-0.55, 0.55]) g.push(x + s * 0.36, y, z + dz).box(0.03, hh * 0.6, 0.36, 0.01).pop();
        }
    }
    // the taffrail: a gilded arch over the top of her stern, with a carved board under it on the grandest hulls
    const archH = grand > 1 ? 1.5 : 0.8,
        archW = sideX(0, sternTop),
        archAt = (a: number): Point => [(a * 2 - 1) * archW, sternTop + 0.08 + archH * Math.sin(PI * a), sternZ(sternTop + 0.08 + archH * Math.sin(PI * a)) + 0.02];
    if (grand) {
        const N = 10;
        for (let k = 0; k < N; k++) {
            const a = archAt(k / N),
                b = archAt((k + 1) / N);
            gilt().strut(a, b, 0.05 + 0.025 * grand, 0.05 + 0.025 * grand, 6);
            if (grand > 1) {
                wood(CABIN);
                for (const seen of [0, 2 * L]) g.flat([[a[0], sternTop, sternZ(sternTop)], [b[0], sternTop, sternZ(sternTop)], [b[0], b[1], sternZ(b[1])], [a[0], a[1], sternZ(a[1])]], 0, sternTop, seen);
            } else if (k % 2 === 1 && k < N - 1) gilt().strut([b[0], sternTop, sternZ(sternTop)], b, 0.035, 0.035, 5);
        }
        // a carved scroll on each hand: curled under the arch on the grandest hulls, beside the name board on the rest
        const curl = grand > 1 ? archH * 0.27 : 0.2,
            cx = grand > 1 ? archW * 0.42 : w0 * 0.78,
            cy = grand > 1 ? sternTop + archH * 0.42 : gy0 * 0.47;
        gilt();
        for (const s of [-1, 1])
            for (let k = 0; k < 11; k++) {
                // a spiral: each turn of the stroke a little tighter than the last
                const at = (j: number): Point => {
                    const y = cy + Math.sin(j * 0.62) * curl * (1 - j * 0.07);
                    return [s * (cx + Math.cos(j * 0.62) * curl * (1 - j * 0.07)), y, sternZ(y) + 0.06];
                };
                g.strut(at(k), at(k + 1), 0.04, 0.04, 5);
            }
        // scrolls where the arch springs from the rail
        for (const s of [-1, 1]) gilt().push(s * archW, sternTop + 0.12, sternZ(sternTop + 0.12) + 0.02).sphere(0.11 + 0.07 * grand, 8, 5).pop();
    }
    // stern lanterns: one on a plain hull, three great gilded ones along the taffrail of the grandest
    let lantern: Point = [0, sternTop + 1.5, sternZ(sternTop) + 0.3];
    if (grand > 1) {
        for (const a of [0.2, 0.5, 0.8]) {
            const base = archAt(a),
                big = a === 0.5 ? 1.25 : 1,
                at: Point = [base[0], base[1] + 0.95 * big, base[2] + 0.3];
            gilt().strut(base, [at[0], at[1] - 0.3 * big, at[2]], 0.06, 0.05, 5);
            g.push(at[0], at[1] - 0.34 * big, at[2]).box(0.3 * big, 0.04, 0.3 * big, 0.02).pop();
            g.push(at[0], at[1] + 0.32 * big, at[2]).cyl(0.3 * big, 0.3 * big, 6, 0.02, 0.04).pop();
            lamp(1, 0.72, 0.36, 0.6).push(at[0], at[1], at[2]).box(0.24 * big, 0.3 * big, 0.24 * big, 0.05).pop();
            if (a === 0.5) lantern = at;
        }
    } else {
        if (grand) lantern = [0, sternTop + archH + 1, sternZ(sternTop + archH) + 0.3];
        g.mat(0.5, 0.8, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]).strut([0, lantern[1] - 1.6, sternZ(lantern[1] - 1.6) - 0.05], [0, lantern[1] - 0.2, lantern[2]], 0.06, 0.05, 5);
        lamp(1, 0.72, 0.36, 0.6).push(lantern[0], lantern[1], lantern[2]).box(0.17, 0.22, 0.17, 0.04).pop();
    }

    // ---- masts, yards, tops and standing rigging ----
    const sails: SailSlot[] = [],
        heads: Point[] = [];
    for (const m of spec.masts) {
        const t = tAt(m.z),
            d = dAt(t),
            r = 0.16 + m.h * 0.007,
            head: Point = [0, d + m.h, m.z],
            topY = d + m.h * 0.7;
        wood(SPAR, 0.7).push(0, d - 0.3, m.z).cyl(r, m.h + 0.3, 8, 0.02, r * 0.55).pop();
        g.push(0, topY, m.z).cyl(0.62 + 0.16 * grand, 0.42, 8 + 2 * grand, 0.04).pop();
        for (const [y, w, h] of m.sails) {
            // a yard is stoutest at the slings and tapers to each arm
            for (const s of [-1, 1]) g.strut([0, d + y, m.z - 0.32], [s * (w / 2 + 0.45), d + y, m.z - 0.32], 0.15, 0.08, 6);
            sails.push({ y: d + y - 0.1, z: m.z - 0.34, w, h });
        }
        if (fine) {
            // gilded bands at the partners and under the top, and a gold truck at the masthead
            gilt().push(0, d + 1.5, m.z).cyl(r + 0.04, 0.16, 8, 0.01).pop();
            g.push(0, topY - 0.2, m.z).cyl(r * 0.82 + 0.05, 0.16, 8, 0.01).pop();
            g.push(0, head[1] + 0.12, m.z).sphere(0.18, 8, 5).pop();
            if (grand > 1) g.push(0, topY + 0.4, m.z).cyl(0.8 + 0.16 * grand, 0.07, 12, 0.02).pop();
        }
        // shrouds from the chains up to the top; the grandest hulls have ratlines to climb them by
        tarred();
        const offs = grand ? [-1.6, 0, 1.6] : [-1.3, 1.5];
        for (const s of [-1, 1]) {
            const feet = offs.map((o) => brink(tAt(m.z + o), s)),
                top: Point = [0, topY, m.z];
            for (const f of feet) g.strut(f, top, 0.035, 0.035, 4);
            if (grand > 1) for (let k = 1; k <= 6; k++) g.strut(lerp3(feet[0], top, k / 8), lerp3(feet[2], top, k / 8), 0.02, 0.02, 3);
            // running rigging to every yard: a lift from the mast above it, and a brace led aft and down to her side
            for (const [y, w] of m.sails) {
                const arm: Point = [s * (w / 2 + 0.4), d + y + 0.04, m.z - 0.32];
                g.strut([0, Math.min(head[1], d + y + 1 + w * 0.16), m.z - 0.1], arm, 0.018, 0.018, 3);
                g.strut(arm, brink(tAt(Math.min(m.z + w * 0.8, zs - 0.2)), s), 0.018, 0.018, 3);
            }
            // and on a finished hull, a backstay from each masthead
            if (grand) g.strut(head, brink(tAt(Math.min(m.z + 3.4, zs - 0.5)), s), 0.03, 0.03, 4);
            // where her shrouds come down to the open rail: a channel to spread them, and iron chainplates under it
            if (over(t) < 0 && !(grand && t > TF - HANCE)) {
                const span = offs[offs.length - 1] - offs[0];
                wood(WALE, 0.7).push(...(on(t, gAt(t) - 0.08, s, 0.16) as [number, number, number])).box(0.17, 0.035, span / 2 + 0.3, 0.02).pop();
                g.mat(0.5, 0.8, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
                for (const o of offs) g.strut(on(tAt(m.z + o), gAt(t) - 0.1, s, 0.28), on(tAt(m.z + o), gAt(t) - 0.85, s, 0.03), 0.028, 0.028, 4);
                tarred();
            }
        }
        heads.push(head);
    }
    // the tallest masthead flies the flag; on a finished hull the others fly streamers
    const top = heads.reduce((a, b) => (b[1] > a[1] ? b : a)),
        pennants = grand ? heads.filter((h) => h !== top) : [];
    const sprit: Point = [0, gAt(1) + L * 0.085, -L / 2 - L * 0.21],
        fore = spec.masts[0],
        foreD = dAt(tAt(fore.z)),
        foreHead: Point = [0, foreD + fore.h, fore.z],
        foreTop: Point = [0, foreD + fore.h * 0.7, fore.z],
        spritFoot = pt(0.93, 0, gAt(0.93) - 0.1);
    wood(SPAR, 0.7).strut(spritFoot, sprit, 0.17, 0.08, 6);
    tarred();
    g.strut(foreHead, sprit, 0.03, 0.03, 4);
    g.strut(foreTop, [sprit[0], sprit[1] * 0.8, sprit[2] * 0.86], 0.03, 0.03, 4);
    for (let i = 1; i < spec.masts.length; i++) {
        const a = spec.masts[i - 1],
            b = spec.masts[i];
        g.strut([0, dAt(tAt(a.z)) + a.h, a.z], [0, dAt(tAt(b.z)) + b.h, b.z], 0.03, 0.03, 4);
    }

    // ---- fore-and-aft canvas on a finished hull: jibs on the stays forward, and a driver on a boom
    // from her last mast, sheeted out over the stern ----
    const jibs: JibSlot[] = [];
    if (grand) {
        jibs.push({ tack: lerp3(spritFoot, sprit, 0.96), head: lerp3(sprit, foreHead, 0.8), clew: [0, foreD + 2.6, fore.z - 3] });
        if (grand > 1) jibs.push({ tack: lerp3(spritFoot, sprit, 0.52), head: lerp3(sprit, foreTop, 0.84), clew: [0, foreD + 2.3, fore.z - 2.2] });
        const m = spec.masts[spec.masts.length - 1],
            d = dAt(tAt(m.z)),
            tack: Point = [0, Math.max(d + 2.3, sternTop + 1.3), m.z + 0.4],
            // the boom stops short of the taffrail and its lanterns
            clew: Point = [0, tack[1] + 0.25, Math.min(m.z + L * 0.3, sternZ(sternTop) - 1.3)];
        jibs.push({ tack, head: [0, Math.max(d + m.h * 0.6, tack[1] + 3), m.z + 0.4], clew });
        wood(SPAR, 0.7).strut([0, tack[1] - 0.12, m.z + 0.2], [0, clew[1] - 0.12, clew[2] + 0.35], 0.12, 0.08, 6);
    }

    // ---- the head: a figurehead under the bowsprit, carried on gilded rails on the grandest hulls ----
    if (grand) {
        const k = 0.75 + 0.45 * grand,
            stem = pt(1, 0, gAt(1)),
            foot: Point = [0, stem[1] - 0.75 * k, stem[2] - 0.05],
            chin: Point = [0, stem[1] + 0.05 * k, stem[2] - 1.05 * k];
        // catheads: a timber over each bow, with her anchor hung from it
        for (const s of [-1, 1]) {
            const root = brink(0.87, s),
                end: Point = [root[0] + s * 1.05, root[1] + 0.12, root[2] - 0.2],
                crown: Point = [end[0], end[1] - 1.9 * (0.8 + 0.1 * grand), end[2]];
            wood(WALE, 0.7).strut([root[0] - s * 0.5, root[1] + 0.05, root[2] + 0.1], end, 0.12, 0.1, 6);
            if (grand > 1) gilt().push(end[0], end[1], end[2]).sphere(0.15, 7, 5).pop();
            wood(SPAR, 0.7).strut([end[0], end[1] - 0.5, end[2] - 0.55], [end[0], end[1] - 0.5, end[2] + 0.55], 0.06, 0.06, 5);
            g.mat(0.5, 0.8, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
            g.strut([end[0], end[1] - 0.2, end[2]], crown, 0.055, 0.055, 5);
            for (const f of [-1, 1]) {
                const palm: Point = [crown[0], crown[1] + 0.42, crown[2] + f * 0.5];
                g.strut(crown, palm, 0.055, 0.045, 5);
                g.push(palm[0], palm[1], palm[2]).box(0.03, 0.1, 0.1, 0.01).pop();
            }
        }
        gilt().strut(foot, chin, 0.24 * k, 0.15 * k, 8);
        g.push(chin[0], chin[1] + 0.12 * k, chin[2] - 0.1 * k).sphere(0.21 * k, 9, 6).pop();
        // wings swept back along the bow
        for (const s of [-1, 1]) g.strut(lerp3(foot, chin, 0.6), [s * 0.62 * k, stem[1] + 0.1 * k, stem[2] + 0.5 * k], 0.11 * k, 0.03, 5);
        if (grand > 1)
            for (const s of [-1, 1])
                for (const row of [4, TOP]) {
                    const from = star[NS - 2][row];
                    g.strut([s * (from[0] + 0.05), from[1], from[2]], lerp3(foot, chin, row === TOP ? 0.7 : 0.25), 0.07, 0.05, 5);
                }
    }
    // ---- the wheel: every ship is steered from one. It stands on the quarterdeck just abaft its rail,
    // or right aft on the main deck of a hull with no deck raised over it: a rim on eight spokes that
    // run on through it as handles, turning a barrel on a stand. The stand is forward of the wheel, so
    // whoever steers stands abaft it with nothing between them and the spokes, looking forward. ----
    {
        const k = grand ? 1 : 0.85,
            ht = decksAft ? reach(0) - 1.3 / L : 0.14,
            wz = zAt(ht),
            wy = (decksAft ? roofY[0] : dAt(ht)) + 0.98 * k,
            R = 0.46 * k,
            SPOKES = 8;
        // the stand, and the barrel the tiller ropes wind on
        wood(SPAR, 0.7);
        for (const dz of [0.1, 0.44]) g.push(0, wy - 0.49 * k, wz - dz * k).box(0.13 * k, 0.49 * k, 0.045 * k, 0.015).pop();
        wood(WALE, 0.7).strut([0, wy, wz - 0.44 * k], [0, wy, wz - 0.1 * k], 0.12 * k, 0.12 * k, 8);
        // rim and spokes
        wood(SPAR, 0.55);
        const rim = (i: number, r: number): Point => [Math.sin((i / 24) * 2 * PI) * r, wy + Math.cos((i / 24) * 2 * PI) * r, wz];
        for (let i = 0; i < 24; i++) g.strut(rim(i, R), rim(i + 1, R), 0.04 * k, 0.04 * k, 5);
        for (let i = 0; i < SPOKES; i++) {
            const a = i * (24 / SPOKES);
            g.strut(rim(a, 0.06 * k), rim(a, R), 0.028 * k, 0.022 * k, 5);
            g.strut(rim(a, R), rim(a, R + 0.17 * k), 0.03 * k, 0.018 * k, 5);
        }
        // the hub, capped in brass
        if (fine) gilt();
        else g.mat(0.42, 0.9, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
        g.strut([0, wy, wz - 0.1 * k], [0, wy, wz + 0.07 * k], 0.1 * k, 0.1 * k, 8);
    }
    // ---- deck furniture on a finished hull: gratings over the hatches, a capstan, and on the grandest
    // a boat stowed keel-up amidships ----
    if (grand) {
        const hatches = grand > 1 ? [0.62] : [0.5];
        for (const t of hatches) {
            wood(GRATING, 0.95).push(0, dAt(t) + 0.06, zAt(t)).box(B * 0.14, 0.07, L * 0.045, 0.03).pop();
            wood(SPAR).push(0, dAt(t) + 0.03, zAt(t)).box(B * 0.14 + 0.1, 0.05, L * 0.045 + 0.1, 0.02).pop();
        }
        if (grand > 1) wood(PLANK, 0.7).push(0, dAt(0.62) + 0.5, zAt(0.62), 0, 0, 0, 0.8, 0.5, 2.6).sphere(1, 10, 6).pop();
        const cap = grand > 1 ? 0.385 : 0.41;
        wood(SPAR, 0.7).push(0, dAt(cap), zAt(cap)).cyl(0.34, 0.75, 8, 0.05, 0.26).pop();
        gilt().push(0, dAt(cap) + 0.75, zAt(cap)).cyl(0.4, 0.09, 8, 0.02).pop();
    }

    // ---- guns, both sides: the upper tier run out through the bulwarks, and under it a shorter tier
    // for each gun deck, firing through ports in the hull's side ----
    const muzzles: Point[] = [];
    for (let tier = 0; tier <= decks; tier++) {
        const n = tier ? Math.ceil(spec.guns / 2) : spec.guns;
        for (let i = 0; i < n; i++) {
            const t = 0.24 + ((i + 0.5) / n) * 0.46,
                x = wAt(t) * (tier ? 1.02 : 0.97),
                y = dAt(t) + 0.42 - tier * DECK_RISE,
                z = zAt(t);
            muzzles.push([x + 0.65, y, z]);
            for (const s of [-1, 1]) {
                // a point of the gun: `u` outboard along it from the breech face, `w` along the ship from its middle
                const at = (u: number, v: number, w = 0): Point => [s * (x - GUN_IN + u), v, z + w];
                const iron = () => g.mat(0.36, 0.9, 0, MATERIAL.METAL).col(GUNMETAL[0], GUNMETAL[1], GUNMETAL[2]);
                // the barrel, turned, and the dark of its bore
                g.pushM(m4aim(m4(), s * (x - GUN_IN), y, z, s, 0, 0));
                iron().lathe(tier ? CHASE : BARREL, 10);
                g.mat(1, 0, 0, MATERIAL.WOOD).col(0.012, 0.012, 0.014).lathe(BORE, 10);
                g.pop();
                // below, a gun's port lid is triced up over it, and the hull hides the rest
                if (tier) wood(WALE, 0.7).push(s * (x + 0.1), y + 0.36, z).box(0.12, 0.04, 0.34, 0.01).pop();
                else {
                    // on deck it sits in a truck carriage: two stepped cheeks on a bed, on axletrees and four
                    // trucks, the barrel hung between the cheeks by its trunnions and laid by a quoin under the breech
                    const floor = y - 0.4,
                        block = (u0: number, u1: number, v0: number, v1: number, w: number, hw: number) =>
                            g.push(...(at((u0 + u1) / 2, (v0 + v1) / 2, w) as [number, number, number])).box((u1 - u0) / 2, (v1 - v0) / 2, hw, 0).pop();
                    wood(SPAR, 0.75);
                    for (const w of [-0.2, 0.2]) {
                        block(0.62, 1.14, y - 0.25, y - 0.035, w, 0.035);
                        block(0.3, 0.62, y - 0.25, y - 0.12, w, 0.035);
                        block(-0.04, 0.3, y - 0.25, y - 0.2, w, 0.035);
                    }
                    block(0, 1.12, y - 0.275, y - 0.235, 0, 0.17);
                    wood(WALE, 0.8);
                    for (const [u, r] of [[0.2, 0.1], [0.95, 0.125]]) {
                        block(u - 0.055, u + 0.055, floor + r - 0.045, floor + r + 0.045, 0, 0.25);
                        for (const w of [-0.325, 0.255]) g.push(...(at(u, floor + r, w) as [number, number, number]), 0, PI / 2).cyl(r, 0.07, 8, 0).pop();
                    }
                    // the quoin, with the handle it is drawn out by
                    block(0.04, 0.34, y - 0.235, y - 0.17, 0, 0.08);
                    g.strut(at(-0.12, y - 0.2), at(0.05, y - 0.2), 0.022, 0.022, 4);
                    // trunnions, and the capsquares that hold them down
                    iron().strut(at(0.85, y - 0.02, -0.26), at(0.85, y - 0.02, 0.26), 0.05, 0.05, 5);
                    for (const w of [-0.2, 0.2]) block(0.75, 0.95, y + 0.025, y + 0.045, w, 0.042);
                    // the breeching: a rope from a ringbolt in the bulwark either side, hanging slack to the
                    // deck and up round her cascabel, to take the recoil
                    g.mat(1, 0, 0, MATERIAL.WOOD).col(HEMP[0], HEMP[1], HEMP[2]);
                    for (const w of [-1, 1]) {
                        const line = [at(1.14, y - 0.08, w * 0.44), at(0.7, floor + 0.07, w * 0.42), at(0.2, floor + 0.09, w * 0.38), at(-0.06, y - 0.08, w * 0.16), at(-0.1, y, 0)];
                        for (let k = 0; k + 1 < line.length; k++) g.strut(line[k], line[k + 1], 0.021, 0.021, 4);
                    }
                }
                // every port on the grandest hulls is wreathed in gold; on the rest it is framed in timber
                if (grand > 1) gilt().strut([s * (x + 0.01), y, z], [s * (x + 0.09), y, z], 0.33, 0.3, 8);
                else if (!tier) {
                    wood(WALE, 0.7);
                    for (const d of [-0.27, 0.27]) {
                        g.push(s * (x + 0.02), y + d, z).box(0.05, 0.03, 0.31, 0.01).pop();
                        g.push(s * (x + 0.02), y, z + d).box(0.05, 0.27, 0.03, 0.01).pop();
                    }
                }
                // and a finished hull has a lid to every upper port, swung up and out over the gun
                if (grand && !tier) {
                    if (grand > 1) paint();
                    else wood(WALE, 0.7);
                    g.push(s * (x + 0.24), y + 0.5, z, 0, 0, s * -0.95).box(0.025, 0.24, 0.27, 0.01).pop();
                    if (grand > 1) gilt().push(s * (x + 0.3), y + 0.56, z).sphere(0.06, 6, 4).pop();
                }
            }
        }
    }

    return { mesh: registerMesh(g), len: L, beam: B, draft: D, deck: dAt(0.5), sails, jibs, pennants, guns: muzzles.length, muzzles, flag: top, lantern };
}

/** Points across and down the unit sail's grid. */
const NU = 15,
    NV = 10;
let sailGrid: { cloth: Point[][]; front: Point[][] } | null = null;
/**
 * The unit sail's surface, as a grid of points (across the sail first, then down it) and the way
 * the cloth faces at each. The sail mesh is skinned over it, and sigils are laid on it.
 */
function sailSurface() {
    if (sailGrid) return sailGrid;
    const cloth: Point[][] = [];
    for (let j = 0; j <= NU; j++) {
        const u = j / NU,
            arc = Math.sin(PI * u),
            col: Point[] = [];
        for (let i = 0; i <= NV; i++) {
            const v = i / NV,
                half = (0.43 + 0.07 * Math.pow(v, 0.8)) * (1 - 0.035 * Math.sin(PI * v)),
                belly = 0.22 * Math.pow(arc, 0.85) * Math.sin(PI * 0.8 * Math.pow(v, 0.7)) + 0.012 * Math.abs(Math.sin(PI * u * 5)) * Math.sin(PI * v);
            col.push([(u * 2 - 1) * half, -v * (1 - 0.1 * arc * v * v), -belly]);
        }
        cloth.push(col);
    }
    return (sailGrid = { cloth, front: gridNormals(cloth, () => [0, 0, -1]) });
}

// ---- sigils: the devices a ship can wear on her sails. Each is a shape on a square from -1 to 1
// with y up, given as a test of whether a point is inside it. ----
type Shape = (x: number, y: number) => boolean;

// how far a point is from the stroke between two others
const stroke = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax,
        dy = by - ay,
        f = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(x - ax - dx * f, y - ay - dy * f);
};

const SIGIL_SHAPES: (Shape | null)[] = [
    null,
    // an anchor in a ring of rope
    (x, y) => {
        const rope = Math.hypot(x, y),
            eye = Math.hypot(x, y - 0.6),
            arms = Math.hypot(x, y + 0.08);
        return (
            (rope > 0.86 && rope < 0.98) ||
            // shank, the ring at its head, and the stock across it
            (Math.abs(x) < 0.06 && y > -0.52 && y < 0.5) ||
            (eye > 0.06 && eye < 0.15) ||
            (Math.abs(y - 0.34) < 0.05 && Math.abs(x) < 0.3) ||
            // the arms, sweeping up to a fluke each side, and the crown under them
            (arms > 0.4 && arms < 0.52 && y < -0.22) ||
            (y < -0.02 && y > -0.3 && Math.abs(Math.abs(x) - 0.48) < 0.17 * ((-0.02 - y) / 0.28)) ||
            Math.abs(x) + Math.abs(y + 0.58) < 0.1
        );
    },
    // a skull over crossed bones
    (x, y) => {
        const ax = Math.abs(x);
        // cranium and jaw, and the same grown a little: the bones stop short of it, so it stands clear of them
        const head = (grow: number) => (x / (0.46 + grow)) ** 2 + ((y - 0.3) / (0.42 + grow)) ** 2 < 1 || (ax < 0.27 + grow && y > -0.28 - grow && y < 0.1);
        if (head(0)) {
            const eye = Math.hypot(ax - 0.19, y - 0.26) < 0.125,
                nose = ax * 1.6 + Math.abs(y - 0.02) < 0.1,
                teeth = y < -0.1 && (ax < 0.018 || Math.abs(ax - 0.12) < 0.018);
            return !(eye || nose || teeth);
        }
        if (head(0.07)) return false;
        const bone = stroke(ax, y, -0.76, -0.8, 0.76, -0.1) < 0.075 || stroke(ax, y, 0.76, -0.8, -0.76, -0.1) < 0.075,
            knuckle = Math.hypot(ax - 0.76, y + 0.8) < 0.14 || Math.hypot(ax - 0.76, y + 0.1) < 0.14;
        return bone || knuckle;
    },
    // crossed cutlasses, points up
    (x, y) => {
        const blade = (tilt: number) => {
            // the point in the sword's own frame: `along` from the guard toward the point, `across` its width
            const c = Math.cos(tilt),
                sn = Math.sin(tilt),
                along = x * sn + (y + 0.08) * c,
                across = x * c - (y + 0.08) * sn,
                // a cutlass curves back as it runs to its point
                edge = across - Math.sign(tilt) * 0.16 * Math.max(0, along) ** 2,
                width = 0.08 * clamp((0.98 - along) / 0.35, 0, 1);
            return (
                (along > -0.3 && along < 0.98 && Math.abs(edge) < width) ||
                (Math.abs(along + 0.32) < 0.045 && Math.abs(across) < 0.23) ||
                (along > -0.7 && along < -0.32 && Math.abs(across) < 0.048) ||
                Math.hypot(across, along + 0.76) < 0.09
            );
        };
        return blade(0.72) || blade(-0.72);
    },
    // a compass rose: four long points, four short, on a ring
    (x, y) => {
        const point = (turn: number, long: number, wide: number) => {
            const along = x * Math.sin(turn) + y * Math.cos(turn),
                across = Math.abs(x * Math.cos(turn) - y * Math.sin(turn));
            return along > 0 && across / wide + along / long < 1;
        };
        for (let k = 0; k < 4; k++) if (point((k * PI) / 2, 0.98, 0.2) || point(PI / 4 + (k * PI) / 2, 0.62, 0.16)) return true;
        const r = Math.hypot(x, y);
        return r > 0.7 && r < 0.77;
    },
    // a crown: five points with a pearl on each, over a jewelled band
    (x, y) => {
        if (Math.abs(y + 0.44) < 0.13 && Math.abs(x) < 0.68) return ![-0.4, 0, 0.4].some((cx) => Math.hypot(x - cx, y + 0.44) < 0.06);
        if (Math.abs(y + 0.65) < 0.05 && Math.abs(x) < 0.72) return true;
        if (y >= -0.31 && y < -0.06 && Math.abs(x) < 0.66) return true;
        for (const [cx, tip] of [[-0.6, 0.4], [-0.3, 0.2], [0, 0.58], [0.3, 0.2], [0.6, 0.4]]) {
            if (y >= -0.06 && y < tip && Math.abs(x - cx) < (0.16 * (tip - y)) / (tip + 0.06) + 0.02) return true;
            if (Math.hypot(x - cx, y - tip - 0.06) < 0.085) return true;
        }
        return false;
    },
];

/** The shape of a sigil (by the index a fitting's `sigil` gives), for drawing it; null for none. */
export const sigilShape = (index: number) => SIGIL_SHAPES[index] ?? null;

const sigils = new Map<number, Mesh>();
/**
 * A sigil as a mesh, laid on the unit sail's own surface just proud of the cloth on both faces: so
 * it bellies, furls and shivers with the sail it is drawn on, when drawn with that sail's matrix
 * straight after it. Painted (taking the instance's tint) or worked in gold. Null for no sigil.
 * Built the first time it is asked for.
 */
export function sigilMesh(index: number, gilt: boolean): Mesh | null {
    const shape = SIGIL_SHAPES[index];
    if (!shape) return null;
    const key = index * 2 + (gilt ? 1 : 0);
    let mesh = sigils.get(key);
    if (mesh) return mesh;
    const { cloth, front } = sailSurface(),
        g = new Geo();
    if (gilt) g.mat(0.3, 0.95, 0, MATERIAL.METAL).col(GOLD[0], GOLD[1], GOLD[2]);
    else g.mat(0.8, 0, 0, MATERIAL.PAINT).col(1, 1, 1);
    // a point of the sail between the points of its grid, and the way the cloth faces there
    const onSail = (u: number, v: number) => {
        const fj = Math.min(NU - 1e-6, u * NU),
            fi = Math.min(NV - 1e-6, v * NV),
            j = fj | 0,
            i = fi | 0,
            a = fj - j,
            b = fi - i;
        const mix = (G: Point[][]) => [0, 1, 2].map((k) => (G[j][i][k] * (1 - a) + G[j + 1][i][k] * a) * (1 - b) + (G[j][i + 1][k] * (1 - a) + G[j + 1][i + 1][k] * a) * b);
        return { p: mix(cloth), n: mix(front) };
    };
    const CELLS = 88,
        // how much of the sail it covers: narrower than tall, because a sail is wider than it is deep
        SPAN_U = 0.2,
        SPAN_V = 0.27,
        MID_V = 0.47;
    for (let cy = 0; cy < CELLS; cy++)
        for (let cx = 0; cx < CELLS; cx++) {
            if (!shape(((cx + 0.5) / CELLS) * 2 - 1, ((cy + 0.5) / CELLS) * 2 - 1)) continue;
            for (const face of [1, -1]) {
                const corner = (dx: number, dy: number) => {
                    const u = 0.5 + (((cx + dx) / CELLS) * 2 - 1) * SPAN_U,
                        v = MID_V - (((cy + dy) / CELLS) * 2 - 1) * SPAN_V,
                        { p, n } = onSail(u, v),
                        l = Math.hypot(n[0], n[1], n[2]) || 1,
                        k = (face * 0.006) / l;
                    return g.vert(p[0] + n[0] * k, p[1] + n[1] * k, p[2] + n[2] * k, (face * n[0]) / l, (face * n[1]) / l, (face * n[2]) / l, v * 0.3 * (0.65 + 0.35 * Math.abs(u * 2 - 1)));
                };
                g.quad(corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1));
            }
        }
    sigils.set(key, (mesh = registerMesh(g)));
    return mesh;
}

export function buildModels() {
    for (let i = 0; i < SPECS.length; i++) HULLS.push(hullModel(i));

    // ---- unit sail: bent to its yard along y = 0 and hanging to -1, one unit wide at the foot, full of wind.
    // Cut like a real square sail: narrower at the head than the foot, hollow in the leeches, arched in
    // the foot, and deepest a little below the middle, with each cloth swelling between its seams.
    // The grid runs across the sail first, so that skinning a range of "columns" lays one band from
    // leech to leech: that is how the cloth is shaded darker toward the foot and along its reef bands. ----
    let g = new Geo();
    const N = 6,
        { cloth, front } = sailSurface();
    g.mat(0.95, 0, 0, MATERIAL.CLOTH);
    // the foot and the leeches are free to shiver; the head is bent to the yard
    const flutter = (j: number, i: number) => (i / NV) * 0.3 * (0.65 + 0.35 * Math.abs((j / NU) * 2 - 1));
    const back = front.map((r) => r.map((n) => [-n[0], -n[1], -n[2]]));
    for (let i = 0; i < NV; i++) {
        // weathered toward the foot, and doubled (so darker) along the two reef bands
        const k = (1 - 0.12 * (i / NV)) * (i === 2 || i === 4 ? 0.88 : 1);
        g.col(0.93 * k, 0.9 * k, 0.8 * k);
        g.skin(cloth, front, i, i + 1, flutter);
        g.skin(cloth, back, i, i + 1, flutter);
    }
    M.sail = registerMesh(g);

    // ---- unit jib: a triangle with its tack at the origin, its luff up +Y and its foot along +Z, each one
    // unit long, bellying out to +X. An instance's matrix lays those three axes along a real sail. ----
    g = new Geo();
    const canvas: Point[][] = [];
    for (let i = 0; i <= N; i++) {
        const u = i / N,
            row: Point[] = [];
        for (let j = 0; j <= N; j++) {
            const v = (1 - u) * (j / N);
            row.push([Math.sin(PI * (j / N)) * Math.pow(1 - u, 0.7) * Math.sin(PI * (0.15 + 0.7 * u)), u, v]);
        }
        canvas.push(row);
    }
    g.mat(0.95, 0, 0, MATERIAL.CLOTH).col(0.93, 0.9, 0.8);
    // the leech is free to shiver; the luff is hanked to its stay
    const shiver = (_: number, j: number) => (j / N) * 0.25;
    const windward = gridNormals(canvas, () => [1, 0, 0]);
    g.skin(canvas, windward, 0, N, shiver);
    g.skin(canvas, windward.map((r) => r.map((n) => [-n[0], -n[1], -n[2]])), 0, N, shiver);
    M.jib = registerMesh(g);

    // ---- unit flag: hoisted at the origin, streaming aft ----
    g = new Geo();
    const bunting: Point[][] = [];
    for (let i = 0; i <= 2; i++) {
        const row: Point[] = [];
        for (let j = 0; j <= 5; j++) row.push([0, -i * 0.31, j / 5]);
        bunting.push(row);
    }
    g.mat(0.95, 0, 0, MATERIAL.CLOTH).col(1, 1, 1);
    const fly = (_: number, j: number) => j / 5;
    const face = gridNormals(bunting, () => [1, 0, 0]);
    g.skin(bunting, face, 0, 5, fly);
    g.skin(bunting, face.map((r) => r.map((n) => [-n[0], -n[1], -n[2]])), 0, 5, fly);
    M.flag = registerMesh(g);

    g = new Geo();
    g.mat(0.5, 0.85, 0, MATERIAL.METAL).col(0.09, 0.09, 0.1).sphere(0.3, 8, 5);
    M.ball = registerMesh(g);

    // ---- flotsam: plunder crates and casks, and the planks a broken hull throws off ----
    g = new Geo();
    g.mat(0.9, 0, 0, MATERIAL.WOOD).col(0.56, 0.42, 0.25).box(0.6, 0.6, 0.6, 0.05);
    g.col(0.3, 0.21, 0.13);
    for (const s of [-1, 1]) g.push(0, s * 0.42, 0).box(0.63, 0.07, 0.63, 0.02).pop();
    g.mat(0.4, 0.9, 0, MATERIAL.METAL).col(0.75, 0.58, 0.2).push(0, 0, -0.61).box(0.13, 0.16, 0.03, 0.01).pop();
    M.crate = registerMesh(g);
    g = new Geo();
    g.mat(0.9, 0, 0, MATERIAL.WOOD).col(0.46, 0.31, 0.18).push(0, -0.6, 0).lathe([[0, 0, 0, -1], [0.38, 0, 0, -1], [0.5, 0.6, 1, 0], [0.38, 1.2, 0, 1], [0, 1.2, 0, 1]], 10).pop();
    g.mat(0.5, 0.8, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
    for (const y of [-0.34, 0.34]) g.push(0, y - 0.04, 0).cyl(0.47, 0.08, 10, 0.01).pop();
    M.barrel = registerMesh(g);
    g = new Geo();
    g.mat(0.9, 0, 0, MATERIAL.WOOD).col(SKINS[0].plank[0], SKINS[0].plank[1], SKINS[0].plank[2]).box(0.16, 0.05, 1, 0.02);
    M.plank = registerMesh(g);
}
