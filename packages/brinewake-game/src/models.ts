import { Geo, gridNormals, MATERIAL, type Mesh, type Point, registerMesh } from '@ryqndev/brinewake-renderer';
import { clamp, PI, smooth } from '@ryqndev/kiln-math';

import { buildBelow, PLANK as THICK } from './hull/below';
import { anchor, belfry, binnacle, bitts, boat, bucket, capstan, coil, fifeRail, grating, lantern, pumps, scuttlebutt, shotRack, skylight, windlass } from './hull/deckware';
import { type Flight, type GunSite, type HullKit, round, type Tween } from './hull/kit';
import { LINING, lowerGun, MOUNTS } from './hull/mounts';
import { buildRig, type JibSlot, type MastSpec, type SailSlot } from './hull/rig';
import { buildFlight, buildHatch, PITCH } from './hull/stairs';

export type { Flight, Tween } from './hull/kit';
export type { JibSlot, SailSlot } from './hull/rig';

/** A hull's meshes and the measurements the simulation needs from it. Bow at -Z, waterline at y = 0. */
export interface HullModel {
    /**
     * Her mesh at a level of detail, 0 (the least) .. 3, with the decks below her weather deck built
     * (`inside`: for a ship someone can go aboard) or left out. Built the first time it is asked for.
     * Nothing else about her changes with it: every measurement here is the same at every level.
     */
    lod(detail: number, inside: boolean): Mesh;
    len: number;
    beam: number;
    draft: number;
    /** deck height amidships */
    deck: number;
    sails: SailSlot[];
    jibs: JibSlot[];
    /** mastheads that fly a streamer, on the hulls grand enough for them */
    pennants: Point[];
    /** guns in each battery, port then starboard, and each one's muzzle as it would be on the starboard side (mirror x for port) */
    guns: [number, number];
    muzzles: [Point[], Point[]];
    /** how many of each battery's guns stand on her upper deck, where someone can serve one: they are the first of `muzzles` */
    posts: [number, number];
    /** and how many of those, the first of them, stand inside her cabin: they are fought from in there, by her own hands */
    inside: [number, number];
    /** the cabin under her quarterdeck, if she has one */
    cabin: Cabin | null;
    /** the decks below her weather deck, uppermost first: her gun deck if she has one, then her hold */
    tweens: Tween[];
    /** every flight of steps she has: up to her quarterdeck and her forecastle, and down through her hatches */
    flights: Flight[];
    /**
     * Where someone can stand on her weather decks: sampled evenly from station `t0` to `t1` (0 her
     * stern .. 1 her bow), her open deck under foot at each (`y`) and how far either side of her
     * centreline whatever deck is uppermost there runs (`w`). The decks raised over it, her
     * quarterdeck and forecastle and whatever is built on them, are each level from one point of her
     * length to another (`raised`, z running aft). `stands` is what stands on those decks that
     * nobody walks through, each a round [x, z, radius, the height of the deck it stands on]; `pits`
     * the holes in them, each [x, z, radius].
     */
    walk: { t0: number; t1: number; y: number[]; w: number[]; raised: { z0: number; z1: number; y: number }[]; stands: number[][]; pits: number[][] };
    /** the stretch of her, as [z0, z1], that is hollow down to below the waterline: the sea is not drawn inside it. Null if she has no deck that low */
    dry: number[] | null;
    /** the deck at her wheel, and where along her it stands: whoever steers stands just abaft it */
    helm: Point;
    /** the top of her bulwark amidships, and where along her each mast is stepped */
    rail: number;
    masts: number[];
    /** masthead the flag flies from, and the height markers float at */
    flag: Point;
    lantern: Point;
}

/**
 * The cabin under a ship's quarterdeck: a room with a floor of its own, a step down from her open
 * deck, entered by the door in the bulkhead that closes its forward end. Lengths are the hull's own
 * metres, with z running aft as everywhere in a hull.
 */
export interface Cabin {
    /** its floor, and the underside of the deck over it */
    y: number;
    head: number;
    /** where along her the bulkhead with its door stands, and how far aft there is floor to walk on */
    z0: number;
    z1: number;
    /** how far either side of her centreline someone can stand, sampled evenly from z0 to z1 */
    w: number[];
    /** half the width of the doorway, which is on her centreline */
    door: number;
    /** what stands on its floor that nobody walks through, each as [x0, x1, z0, z1] */
    blocks: number[][];
    /** where its lamp hangs, and the place at its table where whoever keeps her books stands */
    lamp: Point;
    desk: Point;
}

export type ModelName = 'sail' | 'jib' | 'flag' | 'ball' | 'crate' | 'barrel' | 'plank' | 'rope' | 'gangway';

/** The three hulls as launched, smallest first: sloop, brig, galleon. Filled in by buildModels(). */
export const HULLS: HullModel[] = [];
/** Every other instanced mesh in the game. */
export const M = {} as Record<ModelName, Mesh>;

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

// Drawn to the size of the people who walk them: a deck a tall man can stand under, a bulwark to his waist.
const SPECS: HullSpec[] = [
    { len: 21.5, beam: 6.8, draft: 2.4, free: 2.4, guns: 3, cabin: 0, grand: 0, masts: [{ z: -1, h: 20, sails: [[11.5, 11.5, 9], [18.5, 8.2, 6.5]] }] },
    {
        len: 31.5, beam: 8.8, draft: 3.1, free: 3, guns: 5, cabin: 1, grand: 1,
        masts: [
            { z: -6.5, h: 25.6, sails: [[12.5, 13.1, 9.75], [20.5, 9.5, 7.5], [24.75, 6.75, 3.9]] },
            { z: 5.5, h: 28.75, sails: [[13.75, 14.4, 10.75], [23, 10.5, 8.75], [27.6, 7.5, 4.25]] },
        ],
    },
    {
        len: 42.5, beam: 11.2, draft: 4, free: 3.75, guns: 8, cabin: 2, grand: 2,
        masts: [
            { z: -11.9, h: 30.6, sails: [[14.4, 15, 11.25], [23.25, 11.25, 8.5], [29, 8, 5.25]] },
            { z: 1.25, h: 38, sails: [[15.6, 17.5, 12.5], [25.75, 13.1, 9.5], [31.75, 9.25, 5.75], [36.75, 6.25, 4.5]] },
            // the mizzen carries a topsail over her driver, in place of a square course
            { z: 13.1, h: 25, sails: [[22.25, 8.25, 6.25]] },
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

/** How much a gun deck raises the hull, and how far apart the decks under her weather deck are laid, floor to floor: metres. */
const DECK_RISE = 2.2,
    TWEEN = 2.6;
/** How high her bulwark stands over her open deck, and how much room there is between her cabin's floor and the deck over it. */
const BULWARK = 1.05,
    CABIN_HEAD = 2.6;
/** How much higher than the last each further deck of her sterncastle stands. */
const STOREY = 1.7;
/** The stations between which she is hollow below: the decks under her weather deck run from one to the other. */
const HOLD_AFT = 0.14,
    HOLD_FORE = 0.74;

/**
 * Guns in one battery of a hull with `decks` gun decks added, built to the lines `form`, when that
 * battery is mounted as `mount` (see MOUNTS). Known before any mesh is built.
 */
export function gunsASide(hull: number, decks = 0, form = 0, mount = 0) {
    const guns = (MOUNTS[mount] ?? MOUNTS[0]).guns((LINES[form] ?? LINES[0]).guns(SPECS[hull].guns));
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
    // white and gold: limewashed from rail to keel, holystoned decks and pale spars, gilt wherever there is an edge
    { tar: [0.74, 0.74, 0.72], wale: [0.8, 0.79, 0.75], plank: [0.9, 0.89, 0.85], deck: [0.78, 0.72, 0.6], spar: [0.86, 0.83, 0.74], cabin: [0.84, 0.83, 0.79], trim: true },
];

const built = new Map<number, HullModel>();
/** Long guns in both batteries: what every hull mounts unless the yard has fitted something else. */
const NO_ARMS = [0, 0];
/**
 * A hull (an index into HULLS) with works added: gun decks, each raising her by a deck with a
 * lower tier of guns, and storeys of living quarters at the stern; in one of the finishes, built
 * to one of the LINES, and armed as `arms` says: how her port and starboard batteries are mounted
 * (see MOUNTS), which decides how many guns each has and how her side is built for them. Measured
 * the first time it is asked for, and each of her meshes built the first time that is (see
 * HullModel.lod), so only the ships players actually make, as closely as they are actually seen, cost anything.
 */
export function hullModel(hull: number, decks = 0, quarters = 0, skin = 0, form = 0, arms: number[] = NO_ARMS): HullModel {
    const key = hull + 8 * decks + 64 * quarters + 512 * skin + 4096 * form + 32768 * (arms[0] + 8 * arms[1]);
    let model = built.get(key);
    if (!model) {
        const spec = drawn(SPECS[hull], form),
            finish = SKINS[skin] ?? SKINS[0],
            mounted = [arms[0], arms[1]],
            lods = new Map<number, Mesh>(),
            // the coarsest of her, with nothing below: it gives her measurements, and is what she is drawn with far off
            first = buildHull(spec, decks, quarters, finish, mounted, 0, false);
        lods.set(0, registerMesh(first.geo));
        model = {
            ...first.model,
            lod(detail, inside) {
                const v = clamp(Math.round(detail), 0, 3) + (inside ? 4 : 0);
                let mesh = lods.get(v);
                if (!mesh) lods.set(v, (mesh = registerMesh(buildHull(spec, decks, quarters, finish, mounted, v & 3, inside).geo)));
                return mesh;
            },
        };
        built.set(key, model);
    }
    return model;
}

const RIG = [0.1, 0.09, 0.08],
    IRON = [0.11, 0.11, 0.12],
    GOLD = [1, 0.74, 0.24];

const HEMP = [0.3, 0.245, 0.16],
    GUNMETAL = [0.19, 0.19, 0.205];

const lerp3 = (a: Point, b: Point, f: number): Point => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];

function buildHull(spec: HullSpec, decks: number, quarters: number, finish: Finish, arms: number[], q: number, inside: boolean): { model: Omit<HullModel, 'lod'>; geo: Geo } {
    const { len: L, beam: B, draft: D, grand } = spec,
        { tar: TAR, wale: WALE, plank: PLANK, deck: DECK, spar: SPAR, cabin: CABIN } = finish,
        // gilded: because she was built grand, or because her finish gilds whatever it is put on
        fine = grand > 0 || finish.trim,
        F = spec.free + decks * DECK_RISE,
        // her sheer is drawn for the hull she was launched as: a deck added lifts all of it, and sweeps it only a little more
        SHEER = spec.free + decks * DECK_RISE * 0.4;
    const g = new Geo();
    const wood = (c: number[], rough = 0.8) => g.mat(rough, 0, 0, MATERIAL.WOOD).col(c[0], c[1], c[2]);
    const gilt = () => g.mat(0.28, 0.95, 0, MATERIAL.METAL).col(GOLD[0], GOLD[1], GOLD[2]);
    // painted work takes the ship's colours
    const paint = () => g.mat(0.6, 0, 0, MATERIAL.PAINT).col(1, 1, 1);
    // and so does her planking where it is painted, with its seams showing through
    const painted = () => g.mat(0.62, 0, 0, MATERIAL.PAINTED).col(1, 1, 1);
    const tarred = () => g.mat(0.9, 0, 0, MATERIAL.PAINT).col(RIG[0], RIG[1], RIG[2]);
    const lamp = (r: number, gr: number, b: number, e: number) => g.mat(0.3, 0, e, MATERIAL.EMISSIVE).col(r, gr, b);
    // untinted, unseamed stuff: paper, linen, glass, iron
    const plain = (c: number[], rough = 0.85, metal = 0) => g.mat(rough, metal, 0, MATERIAL.METAL).col(c[0], c[1], c[2]);
    const ironwork = () => (fine ? gilt() : plain(IRON, 0.5, 0.8));
    const black = () => g.mat(0.5, 0.8, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
    // t runs 0 at the stern to 1 at the bow
    const zAt = (t: number) => L / 2 - t * L;
    const tAt = (z: number) => (L / 2 - z) / L;
    const wAt = (t: number) => Math.max(0.05, (B / 2) * Math.min(1, 0.72 + 1.3 * t) * (1 - Math.pow(Math.max(0, (t - 0.4) / 0.6), 2.4)));
    // gunwale: sweeping up to the stern and at the bow, a little more on a grander hull. Most of her
    // height aft comes from the decks built up on this rail, not from the rail itself.
    const gAt = (t: number) => F + B * 0.2 * smooth(0.4, 0, t) * (0.62 + 0.1 * grand) + SHEER * (0.52 + 0.16 * grand) * t * t * t;
    const kAt = (t: number) => -D * (1 - 0.6 * t ** 3 - 0.2 * (1 - t) ** 4);
    const dAt = (t: number) => gAt(t) - BULWARK;
    // the top of her wale, where her side is broadest: a deck added lifts her rail, and her paint only a little
    const wY = (t: number) => (gAt(t) - decks * DECK_RISE * 0.85) * 0.55;
    const inAt = (t: number) => Math.max(0.02, wAt(t) * 0.97 - 0.16);
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

    const decksAft = spec.cabin + quarters,
        gy0 = gAt(0),
        w0 = wAt(0),
        zs = L / 2,
        // how far forward the sterncastle reaches: further for every deck it carries
        T0 = decksAft ? Math.min(0.44, 0.2 + 0.04 * grand + 0.03 * (decksAft - 1)) : 0,
        // solid bulwark standing above each raised deck, under its rail
        WALL = 0.46,
        // how far along her length a bulwark takes to sweep down where its deck ends
        HANCE = 0.024,
        // where the forecastle begins, and the height of its deck
        TF = 0.8,
        fcY = gAt(TF) + 0.5 + 0.3 * grand,
        // The cabin under her quarterdeck has a floor of its own, laid level a step below the deck at
        // its door: her open deck sweeps up toward the stern, and would leave no room to stand under there.
        CABIN_STEP = 0.25,
        cabinY = decksAft ? dAt(T0) - CABIN_STEP : 0,
        // half the width of a doorway
        DOOR = 0.6;

    // ---- the decks raised over her open one. Aft, a deck for the cabin she was launched with and one
    // more for every level of living quarters built, each shorter than the one below, so the stern
    // climbs in steps the way a galleon's does; and on a finished hull a forecastle at the bow. ----
    const reach = (k: number) => T0 * (1 - (0.8 * k) / decksAft);
    // each deck is level: the lowest gives standing room in the cabin under it, the rest climb from it
    const roofY: number[] = [];
    for (let k = 0; k < decksAft; k++) roofY.push(k ? roofY[k - 1] + STOREY : cabinY + CABIN_HEAD + 0.05);
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
    // the deck under foot at a station
    const floorY = (t: number) => {
        const k = over(t);
        return k >= 0 ? roofY[k] : grand && t >= TF ? fcY : dAt(t);
    };
    // how far out her side stands at a height, below the rail as well as above it
    const outX = (t: number, y: number) => {
        const w = wAt(t),
            gy = gAt(t),
            k = kAt(t);
        if (y >= gy) return sideX(t, y);
        const prof = [[k, 0], [k * 0.82, w * 0.55], [k * 0.3, w * 0.9], [0.3, w], [wY(t), w * 1.03]];
        if (grand) prof.push([gy * 0.82, w]);
        prof.push([gy, w * 0.97]);
        for (let i = 1; i < prof.length; i++)
            if (y <= prof[i][0]) return prof[i - 1][1] + (prof[i][1] - prof[i - 1][1]) * clamp((y - prof[i - 1][0]) / (prof[i][0] - prof[i - 1][0]), 0, 1);
        return w * 0.97;
    };
    // a point on her side, stood off it by `out`
    const on = (t: number, y: number, s: number, out = 0): Point => pt(t, s * (outX(t, y) + out), y);

    const kit: HullKit = {
        g, L, B, grand, fine, q,
        spar: SPAR, wale: WALE, deck: DECK, plank: PLANK, cabin: CABIN,
        wood, gilt, paint, tarred, plain, ironwork, lamp,
        iron: () => g.mat(0.36, 0.9, 0, MATERIAL.METAL).col(GUNMETAL[0], GUNMETAL[1], GUNMETAL[2]),
        dark: () => g.mat(1, 0, 0, MATERIAL.WOOD).col(0.012, 0.012, 0.014),
        hemp: () => g.mat(1, 0, 0, MATERIAL.WOOD).col(HEMP[0], HEMP[1], HEMP[2]),
        on, zAt, tAt, wAt, gAt, dAt, kAt, outX, pt,
    };

    // ---- her armament. What each battery is mounted as decides how many guns it has, where along her
    // they stand, and whether her bulwark is pierced for them or cut away. Everything after this that
    // follows her rail asks railCut() before it builds. ----
    const mounts = [MOUNTS[arms[0]] ?? MOUNTS[0], MOUNTS[arms[1]] ?? MOUNTS[0]],
        sideOf = (s: number) => (s < 0 ? 0 : 1);
    // her open deck: clear of the sterncastle and, on a finished hull, of the forecastle
    const waist0 = Math.max(0.24, decksAft ? T0 + HANCE + 0.02 : 0),
        waist1 = Math.min(0.72, grand ? TF - HANCE - 0.02 : 1);
    // where each gun of a battery's upper tier stands: at the ports she was drawn with, or, for guns her
    // bulwark is cut down for, shared out along the open deck
    const stations = mounts.map((m) => {
        const n = m.guns(spec.guns),
            [a, b] = m.cut ? [waist0, waist1] : [0.24, 0.7];
        return Array.from({ length: n }, (_, i) => a + ((i + 0.5) / n) * (b - a));
    });
    // the gaps cut in her bulwark, a side: each from one station to another, as wide as there is room for
    const cuts = mounts.map((m, si) => {
        if (!m.cut) return [];
        const half = Math.min(m.cut / L, (waist1 - waist0) / stations[si].length / 2 - 0.3 / L);
        return stations[si].map((t) => ({ t0: t - half, t1: t + half }));
    });
    const railCut = (t: number, s: number) => cuts[sideOf(s)].find((c) => t > c.t0 && t < c.t1);
    // the top of her bulwark: the gunwale, or her deck where it has been cut away
    const railY = (t: number, s: number) => (railCut(t, s) ? dAt(t) + 0.02 : gAt(t));
    // the nearest station to `t` that is not in a gap: what would have come down to the rail there is led to its edge
    const clearOf = (t: number, s: number) => {
        const c = railCut(t, s);
        return c ? (t - c.t0 < c.t1 - t ? c.t0 - 0.25 / L : c.t1 + 0.25 / L) : t;
    };
    // a point on the top of her side; where her bulwark is cut away there, on the edge of the gap instead
    const brink = (t: number, s: number): Point => {
        const u = clearOf(t, s);
        return pt(u, s * sideX(u, topY(u)), topY(u));
    };

    // ---- the decks below, and the way down to them. Under her weather deck she is hollow from one
    // bulkhead to another: a hold, and over it a gun deck for every tier of guns built into her. Each
    // is level, laid under the lowest point of what is over it, a tall man's height and a beam below. ----
    const overhead = (t: number) => (decksAft && t < T0 ? cabinY : dAt(t)) - THICK;
    let lowest = Infinity;
    for (let i = 0; i <= 30; i++) lowest = Math.min(lowest, overhead(HOLD_AFT + ((HOLD_FORE - HOLD_AFT) * i) / 30));
    const floors: number[] = [],
        gunFloor = lowest + THICK - TWEEN;
    // as many as she has the depth for: a floor too far down her bilge is too narrow to be a deck
    for (let i = 0; i <= decks; i++) {
        const y = lowest + THICK - TWEEN * (i + 1);
        if (outX(0.45, y) - LINING > 1.55) floors.push(y);
    }
    // What stands along her centreline, each as the stretch of her length it takes up: her masts first,
    // then whatever claims a place in what is left of her waist.
    const taken: number[][] = spec.masts.map((m) => [m.z - 0.95, m.z + 0.95]);
    const claim = (want: number, len: number, lo: number, hi: number): number | null => {
        let best: number | null = null;
        for (let c = lo + len / 2; c <= hi - len / 2 + 1e-6; c += 0.1) {
            if (taken.some(([a, b]) => c + len / 2 > a && c - len / 2 < b)) continue;
            if (best === null || Math.abs(c - want) < Math.abs(best - want)) best = c;
        }
        if (best !== null) taken.push([best - len / 2, best + len / 2]);
        return best;
    };
    // her wheel: on the quarterdeck just abaft its rail, or right aft on the main deck of a hull with no deck raised over it
    const helmT = decksAft ? reach(0) - 1.7 / L : 0.14,
        // her waist: from the foot of the steps to her quarterdeck (or before her wheel) to the foot of those to her forecastle
        waistAft = decksAft ? zAt(T0) - (roofY[0] - dAt(T0)) * PITCH - 1 : zAt(helmT) - 2.3,
        waistFore = grand ? zAt(TF) + (fcY - dAt(TF)) * PITCH + 1 : zAt(0.8);
    // Every flight of steps she has. The companionway comes first: one flight under another, down
    // through a hatch in her waist as far aft as there is room for it, its head at the after end.
    const flights: Flight[] = [];
    if (floors.length) {
        const run = (dAt(0.45) - floors[0] + 0.5) * PITCH,
            ENTRY = 0.9,
            c = claim(1e9, run + ENTRY, Math.max(waistFore, zAt(0.7)), Math.min(waistAft, zAt(HOLD_AFT) - 1.7));
        if (c === null) floors.length = 0;
        else {
            const zTop = c + (run + ENTRY) / 2 - ENTRY,
                yTop = dAt(tAt(zTop));
            flights.push({ x0: -0.55, x1: 0.55, zTop, zFoot: zTop - (yTop - floors[0]) * PITCH, yTop, yFoot: floors[0], top: 0, foot: 1 });
            for (let i = 1; i < floors.length; i++) flights.push({ x0: -0.55, x1: 0.55, zTop, zFoot: zTop - TWEEN * PITCH, yTop: floors[i - 1], yFoot: floors[i], top: i, foot: i + 1 });
        }
    }
    const hatch = flights.length ? flights[0] : null,
        hole = hatch ? [tAt(hatch.zTop), tAt(hatch.zFoot)] : null;

    // stations her shell and deck are lofted at: evenly along her, and close either side of every edge of a gap, so that it is cut square
    const NS = [14, 22, 32, 44][q],
        TS = Array.from({ length: NS + 1 }, (_, i) => i / NS);
    for (const side of cuts) for (const c of side) for (const e of [c.t0, c.t1]) TS.push(e - 0.015 / L, e + 0.015 / L);
    // at the bulkhead of her cabin, where her open deck stops and the cabin's own floor takes over; and at either end of her hatch
    for (const t of [...(decksAft ? [T0] : []), ...(hole ?? [])]) if (!TS.some((u) => Math.abs(u - t) < 1e-4)) TS.push(t);
    TS.sort((a, b) => a - b);

    // ---- shell: keel, bilge, waterline, wale, gunwale at each station, a side at a time, since her
    // two sides may be cut differently, and a fair curve drawn through them: the finer she is built,
    // the more strakes it is drawn in. A finished hull has one more strake under the gunwale, painted
    // like the wale. ----
    const SUB = [1, 2, 3, 4][q];
    const corners = (t: number, s: number): number[][] => {
        const w = wAt(t),
            k = kAt(t),
            gy = gAt(t),
            top = railY(t, s),
            row = [[0, k], [w * 0.55, k * 0.82], [w * 0.9, k * 0.3], [w, 0.3], [w * 1.03, Math.min(wY(t), top - 0.12)]];
        if (grand) row.push([w, Math.min(gy * 0.82, top - 0.05)]);
        row.push([w * 0.97, top]);
        return row;
    };
    const shellRow = (t: number, s: number): Point[] => {
        const c = corners(t, s),
            row: Point[] = [];
        for (let i = 0; i + 1 < c.length; i++) {
            const p0 = c[Math.max(0, i - 1)],
                p1 = c[i],
                p2 = c[i + 1],
                p3 = c[Math.min(c.length - 1, i + 2)];
            for (let j = 0; j < SUB; j++) {
                const u = j / SUB,
                    // a Catmull-Rom spline through the corners
                    f = (a: number, b: number, d: number, e: number) => 0.5 * (2 * b + (d - a) * u + (2 * a - 5 * b + 4 * d - e) * u * u + (3 * b - a - 3 * d + e) * u * u * u);
                row.push(pt(t, s * Math.max(0, f(p0[0], p1[0], p2[0], p3[0])), f(p0[1], p1[1], p2[1], p3[1])));
            }
        }
        const e = c[c.length - 1];
        row.push(pt(t, s * e[0], e[1]));
        return row;
    };
    const shell = [-1, 1].map((s) => TS.map((t) => shellRow(t, s))),
        star = shell[1];
    const TOP = star[0].length - 1;
    const mirror = (p: Point): Point => [-p[0], p[1], p[2]];
    for (const s of [-1, 1]) {
        const P = shell[sideOf(s)],
            N = gridNormals(P, () => [s, -0.35, 0]);
        wood(TAR, 0.7).skin(P, N, 0, 3 * SUB);
        painted().skin(P, N, 3 * SUB, 4 * SUB);
        wood(PLANK).skin(P, N, 4 * SUB, 5 * SUB);
        if (grand) painted().skin(P, N, 5 * SUB, 6 * SUB);
    }
    // transom, closing the stern: tarred, painted and planked in the same bands as her sides
    for (let j = 0; j < TOP; j++) {
        const band = Math.floor(j / SUB);
        if (band < 3) wood(TAR, 0.7);
        else if (band === 3 || band === 5) painted();
        else wood(PLANK);
        g.flat([star[0][j], star[0][j + 1], mirror(star[0][j + 1]), mirror(star[0][j])], 0, 0, 0);
    }
    // gilded mouldings run the length of her, along every seam between paint and plank
    if (fine) {
        gilt();
        const r = 0.04 + 0.02 * grand;
        for (const band of grand > 1 ? [4, 5, -1] : grand ? [5, -1] : [4, -1]) {
            const row = band < 0 ? TOP : band * SUB;
            for (const s of [-1, 1])
                for (let i = 0; i + 1 < TS.length; i++) {
                    const a = shell[sideOf(s)][i][row],
                        b = shell[sideOf(s)][i + 1][row];
                    g.strut([a[0] + s * 0.03, a[1], a[2]], [b[0] + s * 0.03, b[1], b[2]], r, r, 5);
                }
            // and on across the transom, which stands aft of the sternpost by the sweep of her counter
            if (row !== TOP) g.strut([-star[0][row][0], star[0][row][1], star[0][row][2] + 0.02], [star[0][row][0], star[0][row][1], star[0][row][2] + 0.02], r, r, 5);
        }
    }
    // her backbone: the keel under her, the stem she cuts the water with, and the sternpost her rudder is hung on
    wood(TAR, 0.75);
    {
        const n = Math.max(6, Math.round(NS / 2));
        for (let i = 0; i < n; i++) {
            const a = (0.985 * i) / n,
                b = (0.985 * (i + 1)) / n;
            g.strut(pt(a, 0, kAt(a) - 0.08), pt(b, 0, kAt(b) - 0.08), 0.14, 0.14, 4);
        }
        const m = 5 + q;
        for (let i = 0; i < m; i++) {
            const ya = kAt(1) - 0.08 + ((gAt(1) + 0.45 - kAt(1)) * i) / m,
                yb = kAt(1) - 0.08 + ((gAt(1) + 0.45 - kAt(1)) * (i + 1)) / m,
                a = pt(1, 0, Math.min(ya, gAt(1))),
                b = pt(1, 0, Math.min(yb, gAt(1)));
            if (i < 2) wood(TAR, 0.75);
            else wood(WALE, 0.75);
            g.strut([0, ya, a[2] - 0.06], [0, yb, b[2] - 0.06], 0.16, i === m - 1 ? 0.1 : 0.16, 4 + q);
        }
        wood(TAR, 0.75)
            .push(0, (kAt(0) + 0.3) / 2 - 0.05, zs + 0.03)
            .box(0.12, (0.3 - kAt(0)) / 2 + 0.05, 0.1, 0.02)
            .pop();
    }

    // ---- deck, the inside of the bulwarks and the rail capping them ----
    let prev: number[] | null = null,
        prevT = 0;
    for (const t of TS) {
        const w = inAt(t),
            o = wAt(t) * 0.97,
            d = dAt(t),
            row: number[] = [];
        wood(DECK, 0.9);
        // from side to side, with a place either side of her hatch for the planking to stop at
        for (const x of [-w, hatch ? hatch.x0 : 0, hatch ? hatch.x1 : 0, w]) row.push(g.vert(...(pt(t, x, d) as [number, number, number]), 0, 1, 0));
        wood(PLANK);
        for (const s of [-1, 1]) {
            // where her bulwark is cut away this comes down to the deck, and its capping becomes the sill
            const gy = railY(t, s);
            row.push(g.vert(...(pt(t, s * w, d) as [number, number, number]), -s, 0, 0), g.vert(...(pt(t, s * w, gy) as [number, number, number]), -s, 0, 0));
            row.push(g.vert(...(pt(t, s * w, gy) as [number, number, number]), 0, 1, 0), g.vert(...(pt(t, s * o, gy) as [number, number, number]), 0, 1, 0));
        }
        if (prev) {
            const mid = (t + prevT) / 2;
            // under her quarterdeck there is no open deck: the cabin's floor is laid there instead (see the cabin, below)
            if (!(decksAft && t <= T0 + 1e-6)) {
                if (hole && mid > hole[0] && mid < hole[1]) {
                    g.quad(prev[0], prev[1], row[1], row[0]);
                    g.quad(prev[2], prev[3], row[3], row[2]);
                } else g.quad(prev[0], prev[3], row[3], row[0]);
            }
            for (let k = 4; k < row.length; k += 2) g.quad(prev[k], prev[k + 1], row[k + 1], row[k]);
        }
        prev = row;
        prevT = t;
    }
    g.flat([pt(0, -inAt(0), dAt(0)), pt(0, inAt(0), dAt(0)), pt(0, inAt(0), gAt(0)), pt(0, -inAt(0), gAt(0))], 0, 0, L);

    // ---- the upper works. Her side does not stop at the rail: aft it is carried up, in one sweep of
    // planking that leans in as it rises, to enclose the decks raised there. Where a deck ends the
    // bulwark sweeps down to the next in a hance. A finished hull has a forecastle raised the same
    // way at the bow. Every deck is open to the sky, railed, and reached by steps from the one below. ----
    // a lit window facing along (nx, nz), in a gilded frame on a finished hull, barred with glazing
    // bars as closely as she is built finely (`tilt` leans it back with the face it is set in)
    const light = (x: number, y: number, z: number, half: number, hh: number, nx: number, nz: number, tilt = 0) => {
        const hx = nz ? half : 0.03,
            hz = nz ? 0.03 : half;
        if (fine) gilt().push(x + nx * 0.02, y, z + nz * 0.02, 0, tilt).box(hx + (nz ? 0.07 : 0), hh + 0.07, hz + (nx ? 0.07 : 0), 0.01).pop();
        lamp(1, 0.74, 0.4, 0.45).push(x + nx * 0.05, y, z + nz * 0.05, 0, tilt).box(hx, hh, hz, 0.01).pop();
        if (q < 1) return;
        if (fine) gilt();
        else wood(WALE, 0.7);
        const up = half > 0.3 && q > 1 ? 2 : 1,
            across = hh > 0.3 && q > 1 ? 2 : 1;
        g.push(x + nx * 0.065, y, z + nz * 0.065, 0, tilt);
        for (let i = 1; i <= up; i++) g.push(nz ? -half + (2 * half * i) / (up + 1) : 0, 0, nz ? 0 : -half + (2 * half * i) / (up + 1)).box(nz ? 0.024 : 0.014, hh, nz ? 0.014 : 0.024, 0).pop();
        for (let i = 1; i <= across; i++) g.push(0, -hh + (2 * hh * i) / (across + 1), 0).box(nz ? half : 0.014, 0.024, nz ? 0.014 : half, 0).pop();
        g.pop();
    };
    // a balustrade along a run of points: turned posts under a handrail, gilded as the hull allows
    const fence = (run: Point[]) => {
        for (let k = 0; k < run.length - 1; k++) {
            const a = run[k],
                b = run[k + 1],
                n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / (q > 2 ? 0.4 : 0.55)));
            if (grand > 1 || finish.trim) gilt();
            else wood(SPAR, 0.7);
            for (let i = 0; i <= (k === run.length - 2 ? n : n - 1); i++) {
                const p = lerp3(a, b, i / n);
                g.push(p[0], p[1], p[2]).cyl(0.05, 0.56, round(q, 5), 0.01, 0.032).pop();
                // turned: a swell low on each
                if (q > 1) g.push(p[0], p[1] + 0.12, p[2]).cyl(0.062, 0.12, round(q, 5), 0.03, 0.045).pop();
            }
            if (fine) gilt();
            g.strut([a[0], a[1] + 0.58, a[2]], [b[0], b[1] + 0.58, b[2]], 0.05, 0.05, round(q, 5));
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
    // A door's leaf, in the frame it is built in: upright planks, ledged across on both faces, on
    // strap hinges at one edge (`hung`: -1 its left, 1 its right) with a ring at the other to pull it
    // by. It stands on `y`, `hw` either side of `xc`, and is painted in her colours on a finished hull.
    const leaf = (xc: number, y: number, z: number, hw: number, h: number, hung: number) => {
        const n = Math.max(2, Math.round((hw * 2) / 0.22));
        for (let i = 0; i < n; i++) {
            if (fine) paint();
            else wood(i % 2 ? SPAR : PLANK, 0.85);
            g.push(xc - hw + ((i + 0.5) * 2 * hw) / n, y + h / 2, z).box(hw / n - 0.007, h / 2, 0.022, 0.006).pop();
        }
        wood(WALE, 0.7);
        for (const f of h > 1.3 ? [0.14, 0.5, 0.86] : [0.2, 0.8]) g.push(xc, y + h * f, z).box(hw - 0.02, 0.05, 0.04, 0.01).pop();
        ironwork();
        for (const f of h > 1.3 ? [0.14, 0.86] : [0.2, 0.8]) g.push(xc + hung * (hw - 0.15), y + h * f, z).box(0.15, 0.022, 0.05, 0.005).pop();
        g.push(xc - hung * (hw - 0.11), y + h * 0.5, z).box(0.03, 0.03, 0.075, 0.008).pop();
        for (const dz of [-0.075, 0.075]) g.push(xc - hung * (hw - 0.11), y + h * 0.5 - 0.05, z + dz).cyl(0.045, 0.012, 7, 0.004).pop();
    };
    // the frame a door hangs in: a post either side and a head over them, as deep as the wall it is let into
    const frame = (y: number, z: number, hw: number, h: number, deep: number) => {
        wood(WALE, 0.7);
        for (const s of [-1, 1]) g.push(s * (hw + 0.05), y + h / 2, z).box(0.055, h / 2, deep, 0.012).pop();
        g.push(0, y + h + 0.05, z).box(hw + 0.105, 0.055, deep, 0.012).pop();
    };
    // The bulkhead where a raised deck ends: a door amidships with a light either side, a flight of
    // steps up on each hand, and the deck's rail along its top with a gap at the head of each
    // flight. The door is shut on whatever is stowed behind it, unless the bulkhead is `open`: then
    // it is a doorway through a wall with two faces, its door swung back inside, into her cabin.
    const bulkhead = (t: number, yb: number, yt: number, away: number, open = false) => {
        const z = pt(t, 0, yt)[2],
            wb = yb < gAt(t) ? inAt(t) : sideX(t, yb) - 0.13,
            wt = sideX(t, yt) - 0.13,
            h = yt - yb,
            // how far out the wall runs at a height, and where its lights are let in
            X = (y: number) => wb + ((wt - wb) * (y - yb)) / h,
            lx = open ? Math.max(wt * 0.33, DOOR + 0.3 + wt * 0.11) : wt * 0.33,
            ly = yb + Math.min(1.45, h * 0.62),
            lh = Math.min(0.27, h * 0.14),
            LANE = 0.48,
            run = h * PITCH;
        // The steps stand well out toward her side, but inboard of any gun that is worked where they come down.
        let xl = wt * 0.64;
        for (const side of stations)
            for (const u of side) {
                const gz = zAt(u);
                if (floorY(u) > dAt(u) + 0.01 || (gz - z) * away < -0.7 || (gz - z) * away > run + 0.7) continue;
                xl = Math.min(xl, wAt(u) * 0.97 - 1.55 - LANE - 0.15);
            }
        xl = Math.max(xl, (open ? DOOR : 0.4) + 0.35 + LANE);
        if (open) {
            const H = Math.min(2.3, h - 0.08),
                top = yb + H,
                THICKNESS = 0.09;
            // outside, then inside: each face in three pieces round the doorway
            for (const face of [away, -away]) {
                const zz = face === away ? z : z - away * THICKNESS;
                wood(CABIN);
                for (const s of [-1, 1]) g.flat([[s * X(yb), yb, zz], [s * DOOR, yb, zz], [s * DOOR, top, zz], [s * X(top), top, zz]], 0, yb, zz - face * L);
                g.flat([[-X(top), top, zz], [X(top), top, zz], [wt, yt, zz], [-wt, yt, zz]], 0, yb, zz - face * L);
            }
            // inside, the wall goes on down to the cabin's floor, a step below the sill
            const wf = inAt(t) - 0.03;
            g.flat([[-wf, cabinY, z - away * THICKNESS], [wf, cabinY, z - away * THICKNESS], [X(yb), yb, z - away * THICKNESS], [-X(yb), yb, z - away * THICKNESS]], 0, yb, z - away * THICKNESS + away * L);
            frame(yb, z - (away * THICKNESS) / 2, DOOR - 0.05, H - 0.05, THICKNESS / 2 + 0.035);
            wood(SPAR, 0.8).push(0, yb + 0.015, z - (away * THICKNESS) / 2).box(DOOR, 0.03, THICKNESS / 2 + 0.05, 0.01).pop();
            // a step down inside, to the cabin's floor
            wood(DECK, 0.9).push(0, yb - CABIN_STEP / 2 - 0.02, z - away * (THICKNESS + 0.17)).box(DOOR + 0.12, CABIN_STEP / 2 - 0.02, 0.17, 0.015).pop();
            // the door itself, swung back on its hinges into the cabin
            g.push(DOOR - 0.02, 0, z - away * (THICKNESS + 0.03), away * (PI / 2 - 0.2));
            leaf(DOOR - 0.04, yb + 0.04, 0, DOOR - 0.05, H - 0.1, -1);
            g.pop();
            // and the lights either side of it, seen from within
            if (h > 1.3)
                for (const s of [-1, 1]) {
                    wood(WALE, 0.7).push(s * lx, ly, z - away * (THICKNESS + 0.01)).box(wt * 0.11 + 0.05, lh + 0.05, 0.015, 0.005).pop();
                    lamp(1, 0.8, 0.52, 0.4).push(s * lx, ly, z - away * (THICKNESS + 0.025)).box(wt * 0.11, lh, 0.012, 0.004).pop();
                }
        } else {
            wood(CABIN).flat([[-wb, yb, z], [wb, yb, z], [wt, yt, z], [-wt, yt, z]], 0, yb, z - away * L);
            // a low door: what is behind it is a locker, stooped into
            const H = Math.min(1.9, h - 0.16);
            frame(yb, z + away * 0.03, 0.4, H, 0.045);
            leaf(0, yb + 0.02, z + away * 0.035, 0.4, H - 0.02, 1);
        }
        if (fine) gilt().push(0, yb + Math.min(open ? 2.3 : 1.9, h - 0.1) + 0.13, z + away * 0.04).box(open ? DOOR + 0.1 : 0.56, 0.035, 0.05, 0.02).pop();
        if (h > 1.3) for (const s of [-1, 1]) light(s * lx, ly, z, wt * 0.11, lh, 0, away);
        if (fine) gilt().strut([-wt, yt, z + away * 0.02], [wt, yt, z + away * 0.02], 0.05, 0.05, 5);
        for (const s of [-1, 1]) {
            const zFoot = z + away * run,
                f: Flight = { x0: s * xl - LANE, x1: s * xl + LANE, zTop: z, zFoot, yTop: yt, yFoot: floorY(tAt(zFoot)), top: 0, foot: 0 };
            flights.push(f);
            buildFlight(kit, f);
        }
        fence([[-wt, yt, z], [-xl - LANE - 0.04, yt, z]]);
        fence([[-xl + LANE + 0.04, yt, z], [xl - LANE - 0.04, yt, z]]);
        fence([[xl + LANE + 0.04, yt, z], [wt, yt, z]]);
    };

    // where each raised deck runs along her, for whoever walks them
    const raised: { z0: number; z1: number; y: number }[] = [];
    if (decksAft) {
        if (!grand) raise(0, T0 + HANCE);
        for (let k = 0; k < decksAft; k++) {
            lay(k + 1 < decksAft ? reach(k + 1) : 0, reach(k), roofY[k]);
            bulkhead(reach(k), k ? roofY[k - 1] : dAt(reach(0)), roofY[k], -1, k === 0);
            raised.push({ z0: pt(reach(k), 0, roofY[k])[2], z1: 1e9, y: roofY[k] });
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
                for (let i = -across; i <= across; i++) light(i * gap, (lo + hi) / 2, sternZ((lo + hi) / 2), gap * 0.36, Math.min(0.42, (hi - lo) / 2 - 0.16), 0, 1, lean((lo + hi) / 2));
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

    // ---- the cabin: the room under her quarterdeck, behind the door in its bulkhead. It has a floor
    // of its own (see cabinY), her side lined from that floor to the deck overhead, the beams of that
    // deck and the frames that carry them, her stern lights across its after end, and what a ship's
    // company lives with: a table with the chart on it under a hanging lamp, a locker to sit on under
    // the lights, berths along her sides, a sea chest. Whatever guns she mounts this far aft are in
    // here too, at their ports. Everything in it is seen only from inside, or through the door. ----
    let cabin: Cabin | null = null;
    if (decksAft) {
        const yF = cabinY,
            yC = roofY[0] - 0.05,
            zb = zAt(T0),
            // how far out the lining stands at a station and a height
            half = (t: number, y: number) => (y <= gAt(t) ? inAt(t) : sideX(t, y) - 0.13) - 0.03,
            m = Math.max(4, Math.ceil(T0 / 0.025));
        for (let i = 0; i < m; i++) {
            const a = (T0 * i) / m,
                b = (T0 * (i + 1)) / m;
            wood(DECK, 0.9).flat([pt(a, -half(a, yF), yF), pt(a, half(a, yF), yF), pt(b, half(b, yF), yF), pt(b, -half(b, yF), yF)], 0, -50, 0);
            wood(PLANK, 0.9).flat([pt(a, -half(a, yC), yC), pt(a, half(a, yC), yC), pt(b, half(b, yC), yC), pt(b, -half(b, yC), yC)], 0, yC + 50, 0);
            wood(CABIN);
            for (const s of [-1, 1]) {
                // up to her rail the lining follows her bulwark, and above it her side as it leans in
                const ga = clamp(gAt(a), yF, yC),
                    gb = clamp(gAt(b), yF, yC);
                g.flat([pt(a, s * half(a, yF), yF), pt(b, s * half(b, yF), yF), pt(b, s * half(b, gb), gb), pt(a, s * half(a, ga), ga)], s * 100, yF, zAt(a));
                if (yC - ga > 0.02 || yC - gb > 0.02) g.flat([pt(a, s * half(a, ga), ga), pt(b, s * half(b, gb), gb), pt(b, s * half(b, yC), yC), pt(a, s * half(a, yC), yC)], s * 100, yC, zAt(a));
            }
        }
        // her stern, from inside: it sweeps aft from the floor as far as the top of her wale, and rakes
        // more gently from there up, with her lights set in it at eye level
        {
            const knee = clamp(waleTop, yF, yC),
                // the lining stands a plank's thickness inside her stern, clear of what is let into it from outside
                IN = 0.07,
                face = (x: number, y: number): Point => [x, y, sternZ(y) - IN];
            wood(CABIN);
            for (const [lo, hi] of [[yF, knee], [knee, yC]]) if (hi - lo > 0.02) g.flat([face(-half(0, lo), lo), face(half(0, lo), lo), face(half(0, hi), hi), face(-half(0, hi), hi)], 0, lo, zs + L);
            const yM = Math.max(yF + 1.55, knee + 0.5),
                across = grand > 1 ? 2 : 1,
                gap = (half(0, yM) * 0.82) / across,
                hw = gap * 0.36,
                hh = 0.4;
            for (let i = -across; i <= across; i++) {
                wood(WALE, 0.7).push(i * gap, yM, sternZ(yM) - IN - 0.02, 0, lean(yM)).box(hw + 0.06, hh + 0.06, 0.02, 0.008).pop();
                lamp(1, 0.8, 0.52, 0.45).push(i * gap, yM, sternZ(yM) - IN - 0.04, 0, lean(yM)).box(hw, hh, 0.012, 0.004).pop();
                // glazing bars: a cross at the least, small panes on a ship built with care
                wood(WALE, 0.7);
                const bars = q > 1 ? 2 : 1;
                for (let b = 1; b <= bars; b++) {
                    g.push(i * gap - hw + (2 * hw * b) / (bars + 1), yM, sternZ(yM) - IN - 0.055, 0, lean(yM)).box(0.016, hh, 0.012, 0).pop();
                    const y = yM - hh + (2 * hh * b) / (bars + 1);
                    g.push(i * gap, y, sternZ(y) - IN - 0.055, 0, lean(yM)).box(hw, 0.016, 0.012, 0).pop();
                }
            }
        }
        // the beams of the deck overhead, and under each a frame up her side
        const beams = Math.max(2, Math.round((T0 * L) / 1.15));
        wood(WALE, 0.8);
        for (let i = 1; i < beams; i++) {
            const t = (T0 * i) / beams;
            g.push(0, yC - 0.07, pt(t, 0, yC)[2]).box(half(t, yC), 0.07, 0.06, 0.012).pop();
            for (const s of [-1, 1]) {
                g.strut(pt(t, s * (half(t, yF) - 0.02), yF), pt(t, s * (half(t, yC) - 0.02), yC - 0.05), 0.055, 0.055, 4);
                // and a knee in the angle of every one
                if (q > 1) g.strut(pt(t, s * (half(t, yC) - 0.55), yC - 0.14), pt(t, s * (half(t, yC - 0.55) - 0.05), yC - 0.6), 0.05, 0.05, 4);
            }
        }

        // ---- what is in it ----
        const zS = sternZ(yF),
            ws = half(0.03, yF),
            wd = half(T0, yF),
            blocks: number[][] = [],
            // a box on the floor, and the room it takes up
            stood = (x: number, z: number, hx: number, hz: number) => blocks.push([x - hx, x + hx, z - hz, z + hz]);
        // the stern locker: a seat across the cabin under her lights, cushioned in her colours
        const SEAT = 0.32;
        wood(CABIN).push(0, yF + 0.22, zS - SEAT - 0.03).box(ws - 0.06, 0.22, SEAT, 0.02).pop();
        paint().push(0, yF + 0.47, zS - SEAT - 0.03).box(ws - 0.12, 0.035, SEAT - 0.04, 0.02).pop();
        // the table, athwart the cabin before the locker
        const tz = zS - 2 * SEAT - 1,
            thw = Math.min(1.3, ws * 0.5),
            thd = 0.52,
            ty = yF + 0.82;
        wood(SPAR, 0.6).push(0, ty, tz).box(thw, 0.035, thd, 0.012).pop();
        wood(WALE, 0.7);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.push(sx * (thw - 0.1), (yF + ty - 0.035) / 2, tz + sz * (thd - 0.1)).box(0.04, (ty - 0.035 - yF) / 2, 0.04, 0.008).pop();
        for (const sz of [-1, 1]) g.push(0, yF + 0.2, tz + sz * (thd - 0.1)).box(thw - 0.14, 0.025, 0.025, 0.006).pop();
        stood(0, tz, thw + 0.08, thd + 0.08);
        // on it: the chart, held down at its corners; a pair of dividers; a bottle and a mug; the log
        plain([0.82, 0.75, 0.58], 0.95).push(-thw * 0.28, ty + 0.038, tz, 0.16).box(Math.min(0.44, thw * 0.5), 0.004, 0.32, 0).pop();
        plain([0.45, 0.33, 0.2], 0.9);
        for (const [dx, dz, yaw] of [[-0.12, 0.06, 0.5], [0.05, -0.08, -0.3], [-0.2, -0.1, 1.2]]) g.push(-thw * 0.28 + dx, ty + 0.044, tz + dz, yaw).box(0.16, 0.002, 0.004, 0).pop();
        ironwork();
        for (const [dx, dz] of [[-0.3, 0.26], [0.3, -0.26]]) g.push(-thw * 0.28 + dx * (thw > 0.9 ? 1 : 0.7), ty + 0.055, tz + dz).cyl(0.03, 0.03, 6, 0.006).pop();
        g.strut([-thw * 0.28 + 0.06, ty + 0.05, tz + 0.02], [-thw * 0.28 + 0.2, ty + 0.05, tz + 0.1], 0.008, 0.004, 4);
        g.strut([-thw * 0.28 + 0.06, ty + 0.05, tz + 0.02], [-thw * 0.28 + 0.22, ty + 0.05, tz + 0.03], 0.008, 0.004, 4);
        plain([0.05, 0.16, 0.09], 0.15).push(thw * 0.55, ty + 0.035, tz - 0.12).cyl(0.05, 0.19, round(q, 8), 0.01).pop();
        g.push(thw * 0.55, ty + 0.225, tz - 0.12).cyl(0.02, 0.1, 6, 0.004).pop();
        wood(SPAR, 0.7).push(thw * 0.55 - 0.18, ty + 0.035, tz + 0.06).cyl(0.045, 0.1, round(q, 8), 0.008, 0.04).pop();
        plain([0.3, 0.09, 0.07], 0.8).push(thw * 0.5, ty + 0.062, tz + 0.24, -0.3).box(0.13, 0.027, 0.095, 0.006).pop();
        plain([0.86, 0.82, 0.7], 0.95).push(thw * 0.5, ty + 0.062, tz + 0.24, -0.3).box(0.122, 0.02, 0.1, 0).pop();
        if (q > 1) {
            // a candle in a brass stick, a quill in its inkwell, and a spyglass laid down on the chart
            ironwork().push(-thw * 0.75, ty + 0.035, tz - 0.3).cyl(0.06, 0.02, 7, 0.005).pop();
            plain([0.9, 0.87, 0.75], 0.6).push(-thw * 0.75, ty + 0.055, tz - 0.3).cyl(0.016, 0.15, 5, 0.003).pop();
            lamp(1, 0.7, 0.3, 0.8).push(-thw * 0.75, ty + 0.23, tz - 0.3).sphere(0.02, 5, 3).pop();
            plain([0.06, 0.06, 0.08], 0.3).push(thw * 0.15, ty + 0.035, tz - 0.34).cyl(0.035, 0.05, 6, 0.006).pop();
            plain([0.88, 0.86, 0.8], 0.9).strut([thw * 0.15, ty + 0.07, tz - 0.34], [thw * 0.15 + 0.08, ty + 0.3, tz - 0.3], 0.006, 0.02, 3);
            ironwork().strut([-thw * 0.1, ty + 0.07, tz + 0.3], [thw * 0.22, ty + 0.07, tz + 0.36], 0.028, 0.02, 6);
        }
        // a chair drawn up at each end of it, where there is the room
        const chairs = thw + 0.66 < half(tAt(tz), yF);
        if (chairs)
            for (const s of [-1, 1]) {
                const cx = s * (thw + 0.36);
                wood(SPAR, 0.7).push(cx, yF + 0.47, tz).box(0.2, 0.022, 0.2, 0.008).pop();
                for (const dx of [-1, 1]) for (const dz of [-1, 1]) g.push(cx + dx * 0.17, yF + 0.225, tz + dz * 0.17).box(0.022, 0.225, 0.022, 0.004).pop();
                for (const dz of [-1, 1]) g.push(cx + s * 0.18, yF + 0.75, tz + dz * 0.17).box(0.022, 0.28, 0.022, 0.004).pop();
                if (fine) paint();
                g.push(cx + s * 0.18, yF + 0.88, tz).box(0.018, 0.12, 0.17, 0.006).pop();
                stood(cx, tz, 0.24, 0.24);
            }
        // the lamp, hung from a beam over the table
        const lampAt: Point = [0, yC - 0.46, tz];
        ironwork().strut([0, yC - 0.05, tz], [0, lampAt[1] + 0.15, tz], 0.012, 0.012, 4);
        g.push(0, lampAt[1] + 0.13, tz).cyl(0.11, 0.03, 6, 0.008, 0.03).pop();
        g.push(0, lampAt[1] - 0.14, tz).cyl(0.09, 0.025, 6, 0.006).pop();
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) g.strut([dx * 0.075, lampAt[1] - 0.12, tz + dz * 0.075], [dx * 0.075, lampAt[1] + 0.13, tz + dz * 0.075], 0.008, 0.008, 3);
        lamp(1, 0.74, 0.38, 0.9).push(lampAt[0], lampAt[1], lampAt[2]).box(0.065, 0.11, 0.065, 0.015).pop();

        // berths along her sides, between whatever guns she fights from in here and the table: a board
        // on posts with a mattress, a pillow and a blanket in her colours, and with living quarters
        // built into her a second one over it
        const tiers = quarters > 0 || decksAft > 1 ? 2 : 1,
            LEN = 1.05,
            WIDE = 0.4;
        for (const s of [-1, 1]) {
            const guns = stations[sideOf(s)].filter((t) => t < T0),
                from = Math.max(zb + 1.35, ...guns.map((t) => zAt(t) + 1.15)),
                to = tz - thd - (chairs ? 0.45 : 0.25),
                n = Math.min(3, Math.floor((to - from + 0.15) / (2 * LEN + 0.15)));
            for (let i = 0; i < n; i++) {
                const zc = from + LEN + i * (2 * LEN + 0.15),
                    out = Math.min(half(tAt(zc - LEN), yF), half(tAt(zc + LEN), yF)),
                    xc = s * (out - WIDE - 0.03);
                wood(WALE, 0.7);
                for (const dz of [-1, 1]) g.push(xc - s * (WIDE - 0.03), yF + (0.45 + (tiers - 1) * 1.05 + 0.14) / 2, zc + dz * (LEN - 0.03)).box(0.035, (0.45 + (tiers - 1) * 1.05 + 0.14) / 2, 0.035, 0.008).pop();
                for (let j = 0; j < tiers; j++) {
                    const y = yF + 0.45 + j * 1.05;
                    wood(SPAR, 0.8).push(xc, y, zc).box(WIDE, 0.03, LEN, 0.01).pop();
                    wood(WALE, 0.7).push(xc - s * (WIDE - 0.02), y + 0.08, zc).box(0.02, 0.07, LEN, 0.006).pop();
                    plain([0.78, 0.73, 0.6], 0.95).push(xc + s * 0.02, y + 0.075, zc).box(WIDE - 0.05, 0.05, LEN - 0.04, 0.03).pop();
                    g.push(xc + s * 0.02, y + 0.15, zc + LEN - 0.2).box(WIDE - 0.12, 0.045, 0.13, 0.04).pop();
                    paint().push(xc + s * 0.02, y + 0.085, zc - LEN * 0.32).box(WIDE - 0.04, 0.052, LEN * 0.62, 0.03).pop();
                }
                stood(xc, zc, WIDE + 0.04, LEN + 0.03);
            }
        }
        // a sea chest against the bulkhead, on the side the door does not swing to: only where no gun stands there
        if (wd > 1.95 && !stations[0].some((t) => t < T0 && zAt(t) < zb + 1.4)) {
            const cx = -(DOOR + 0.78),
                cz = zb + 0.42;
            wood(WALE, 0.75).push(cx, yF + 0.2, cz).box(0.4, 0.2, 0.23, 0.02).pop();
            wood(SPAR, 0.75).push(cx, yF + 0.43, cz).box(0.41, 0.04, 0.24, 0.03).pop();
            ironwork();
            for (const dx of [-0.26, 0.26]) g.push(cx + dx, yF + 0.235, cz).box(0.025, 0.24, 0.245, 0.004).pop();
            g.push(cx, yF + 0.34, cz + 0.24).box(0.04, 0.05, 0.012, 0.004).pop();
            stood(cx, cz, 0.44, 0.28);
            // and a shelf over it, with what the purser keeps under his eye
            wood(SPAR, 0.8).push(cx, yF + 1.55, zb + 0.2).box(0.4, 0.02, 0.1, 0.006).pop();
            for (const [dx, c] of [[-0.24, [0.05, 0.16, 0.09]], [-0.02, [0.3, 0.2, 0.08]], [0.2, [0.07, 0.1, 0.2]]] as [number, number[]][]) {
                plain(c, 0.15).push(cx + dx, yF + 1.57, zb + 0.2).cyl(0.045, 0.17, 7, 0.01).pop();
                g.push(cx + dx, yF + 1.74, zb + 0.2).cyl(0.018, 0.07, 5, 0.004).pop();
            }
        }
        // a cask in each after corner, where the table leaves the room
        if (ws - 0.36 > thw + (chairs ? 0.95 : 0.45))
            for (const s of [-1, 1]) {
                const bx = s * (ws - 0.36),
                    bz = zS - 2 * SEAT - 0.36;
                wood(SPAR, 0.75).push(bx, yF, bz).cyl(0.25, 0.34, round(q, 10), 0.02, 0.29).pop();
                g.push(bx, yF + 0.34, bz).cyl(0.29, 0.34, round(q, 10), 0.02, 0.25).pop();
                plain(IRON, 0.5, 0.8);
                for (const y of [0.1, 0.34, 0.58]) g.push(bx, yF + y, bz).cyl(0.295, 0.035, round(q, 10), 0.004).pop();
                stood(bx, bz, 0.3, 0.3);
            }
        // a strip of carpet in her colours, from the door to the table
        const rug0 = zb + 0.75,
            rug1 = tz - thd - 0.35;
        if (rug1 - rug0 > 1.1) paint().push(0, yF + 0.012, (rug0 + rug1) / 2).box(Math.min(0.72, wd * 0.34), 0.01, (rug1 - rug0) / 2, 0).pop();
        // the door, where it stands swung back
        blocks.push([DOOR - 0.12, DOOR + 0.32, zb + 0.08, zb + 2 * DOOR + 0.05]);

        const z1 = zS - 2 * SEAT - 0.14,
            N = 8;
        cabin = {
            y: yF,
            head: yC,
            z0: zb,
            z1,
            w: Array.from({ length: N + 1 }, (_, i) => Math.max(0, half(Math.max(0, tAt(zb + ((z1 - zb) * i) / N)), yF) - 0.3)),
            door: DOOR - 0.1,
            blocks,
            lamp: lampAt,
            desk: [0, yF, tz - thd - 0.5],
        };
    }
    if (grand) {
        // a finished hull is raised and railed from end to end: sterncastle, waist and forecastle
        raise(0, 0.985);
        lay(TF, 0.975, fcY);
        bulkhead(TF, dAt(TF), fcY, 1);
        raised.push({ z0: -1e9, z1: pt(TF, 0, fcY)[2], y: fcY });
    }
    // the rail along the top of her side: its whole length on a finished hull, round the sterncastle on a plain one
    const railEnd = grand ? 0.965 : decksAft ? T0 + HANCE : 0;
    if (railEnd)
        for (const s of [-1, 1]) {
            const m = Math.ceil(railEnd / 0.02);
            let run: Point[] = [];
            for (let i = 0; i <= m; i++) {
                const t = (railEnd * i) / m,
                    y = topY(t);
                if (!railCut(t, s)) {
                    run.push(pt(t, s * (sideX(t, y) - 0.065), y));
                    continue;
                }
                if (run.length > 1) fence(run);
                run = [];
            }
            if (run.length > 1) fence(run);
        }

    // ---- her sides: what stands proud of the planking, so that a hull is more than a smooth shell.
    // Every ship has wales, a capped rail and a rudder. The better she was built, the more is worked
    // into her: fenders, a carved frieze, panelled and arcaded upper works. ----
    // a line worked along both sides between two stations, at a height that may change along the way.
    // With `railed`, it is something that lives on her bulwark, and stops wherever that is cut away.
    const run = (ta: number, tb: number, yOf: (t: number) => number, r: number, out = 0.02, step = 0.03, railed = false) => {
        const m = Math.max(1, Math.ceil((tb - ta) / step));
        for (let i = 0; i < m; i++) {
            const a = ta + ((tb - ta) * i) / m,
                b = ta + ((tb - ta) * (i + 1)) / m;
            for (const s of [-1, 1]) if (!railed || !(railCut(a, s) || railCut(b, s))) g.strut(on(a, yOf(a), s, out), on(b, yOf(b), s, out), r, r, 5);
        }
    };
    // wales: stout strakes at the waterline and (where it is not a gilded moulding) at the top of her paint
    wood(WALE, 0.7);
    run(0, 0.985, () => 0.32, 0.075);
    if (grand === 1 || (!grand && !finish.trim)) run(0, 0.985, wY, 0.07);
    if (grand) run(0, 0.985, (t) => 0.32 + (wY(t) - 0.32) * 0.5, 0.05);
    // and, given the detail, a rubbing strake between each of those and the rail
    if (q > 1) run(0.01, 0.975, (t) => wY(t) + (gAt(t) - wY(t)) * 0.42, 0.04, 0.015);
    if (q > 2) {
        // the bolts that hold her wale to her frames
        black();
        for (let t = 0.02; t < 0.975; t += 0.62 / L) for (const s of [-1, 1]) g.push(...(on(t, wY(t), s, 0.085) as [number, number, number])).sphere(0.03, 4, 3).pop();
    }
    if (!fine) {
        // a plain hull: a capping on her rail, and timberheads standing up through it
        wood(SPAR, 0.7);
        run(decksAft ? T0 + HANCE : 0, 0.985, gAt, 0.06, -0.04, 0.03, true);
        for (let t = (decksAft ? T0 + HANCE : 0) + 0.04; t < 0.95; t += 1.5 / L) for (const s of [-1, 1]) if (!railCut(t, s)) g.push(...(on(t, gAt(t) + 0.1, s, -0.09) as [number, number, number])).box(0.07, 0.15, 0.07, 0.02).pop();
    }
    if (spec.iron) {
        // ironsides: a belt of plate over the wale at her waterline and another under her ports, strapped
        // together up her side between every pair of guns, and a shod stem to meet whatever is in the way
        const belt = wY;
        g.mat(0.45, 0.9, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
        run(0.01, 0.985, () => 0.34, 0.1, 0.035);
        run(0.01, 0.985, belt, 0.085, 0.035);
        for (let t = 0.05; t < 0.93; t += 1.3 / L) for (const s of [-1, 1]) g.strut(on(t, 0.3, s, 0.06), on(t, belt(t), s, 0.06), 0.06, 0.06, 5);
        for (let k = 0; k < 4; k++) g.strut(pt(1, 0, -0.4 + (gAt(1) * 0.6 * k) / 4), pt(1, 0, -0.4 + (gAt(1) * 0.6 * (k + 1)) / 4), 0.2, 0.2, 6);
        // and rivets along both belts, on a ship looked at closely
        if (q > 1) for (let t = 0.02; t < 0.97; t += 0.45 / L) for (const s of [-1, 1]) for (const y of [0.34, belt(t)]) g.push(...(on(t, y, s, 0.13) as [number, number, number])).sphere(0.035, 4, 3).pop();
    }
    if (grand) {
        // fenders: timbers up her side amidships between the ports, on a side that is pierced for guns
        wood(WALE, 0.7);
        for (const s of [-1, 1]) {
            const at = stations[sideOf(s)];
            if (!mounts[sideOf(s)].ports) continue;
            for (let i = 1; i < at.length; i++) {
                const t = (at[i - 1] + at[i]) / 2;
                if (t < 0.36 || t > 0.66) continue;
                for (let k = 0; k < 4; k++) g.strut(on(t, 0.2 + ((gAt(t) - 0.26) * k) / 4, s, 0.05), on(t, 0.2 + ((gAt(t) - 0.26) * (k + 1)) / 4, s, 0.05), 0.065, 0.065, 5);
            }
        }
        // the frieze along her painted upper strake: gilt bosses on a finished hull, and on the grandest
        // a running scroll with a pearl in every turn
        const mid = (t: number) => gAt(t) * 0.91,
            wave = 1.5 / L;
        gilt();
        if (grand > 1) run(0.02, 0.965, (t) => mid(t) + gAt(t) * 0.04 * Math.sin((t / wave) * 2 * PI), 0.035, 0.03, 0.0055, true);
        for (let t = 0.03; t < 0.96; t += grand > 1 ? wave : 1 / L) for (const s of [-1, 1]) if (!railCut(t, s)) g.push(...(on(t, mid(t), s, 0.03) as [number, number, number])).sphere(grand > 1 ? 0.06 : 0.075, round(q, 6), 4).pop();
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
    // ---- and what is worked into her sides and her bulwarks for the people who sail her ----
    // the stretch of her rail that stands over her open deck
    const openA = (decksAft ? T0 + HANCE : 0) + 0.012,
        openB = grand ? TF - HANCE - 0.012 : 0.93,
        // whether her rail is open and whole at a station on a side
        open = (t: number, s: number) => t > openA && t < openB && !railCut(t, s),
        gunAt = (t: number, s: number, pad: number) => stations[sideOf(s)].some((u) => Math.abs(u - t) * L < pad);
    if (q > 0) {
        // the waterway: a stout plank in the angle of deck and bulwark; and her timbers standing inside
        // the bulwark, a stanchion every few feet between the guns
        wood(WALE, 0.8);
        const m = Math.ceil(((openB - openA) * L) / 1.2);
        for (let i = 0; i < m; i++) {
            const a = openA + ((openB - openA) * i) / m,
                b = openA + ((openB - openA) * (i + 1)) / m;
            for (const s of [-1, 1]) g.strut(pt(a, s * (inAt(a) - 0.05), dAt(a) + 0.02), pt(b, s * (inAt(b) - 0.05), dAt(b) + 0.02), 0.07, 0.07, 4);
        }
        for (let t = openA + 0.5 / L; t < openB; t += 1.05 / L)
            for (const s of [-1, 1]) {
                if (!open(t, s) || gunAt(t, s, 0.5)) continue;
                g.push(...(pt(t, s * (inAt(t) - 0.04), dAt(t) + BULWARK / 2) as [number, number, number])).box(0.045, BULWARK / 2 - 0.02, 0.06, 0.012).pop();
            }
    }
    if (q > 1) {
        // scuppers, where the deck drains over her side; and battens up it amidships to come aboard by
        kit.dark();
        for (let t = openA + 1 / L; t < openB; t += 2.3 / L) for (const s of [-1, 1]) if (open(t, s)) g.push(...(on(t, dAt(t) + 0.03, s, 0.012) as [number, number, number])).box(0.014, 0.035, 0.1, 0).pop();
        const at = stations[1],
            entry = at.length > 1 ? (at[Math.floor((at.length - 1) / 2)] + at[Math.floor((at.length - 1) / 2) + 1]) / 2 + 0.55 / L : 0.47;
        wood(WALE, 0.75);
        for (const s of [-1, 1]) if (open(entry, s)) for (let y = 0.7; y < gAt(entry) - 0.15; y += 0.34) g.push(...(on(entry, y, s, 0.035) as [number, number, number])).box(0.04, 0.03, 0.27, 0.01).pop();
    }

    // the rudder, hung on her sternpost: a blade broader at its heel, on pintles strapped across it
    const rudderTop = gy0 * 0.4,
        rudderFoot = kAt(0);
    wood(TAR, 0.7).push(0, (rudderTop + rudderFoot) / 2, zs + 0.36).box(0.08, (rudderTop - rudderFoot) / 2, 0.3, 0.03).pop();
    g.push(0, rudderFoot + (rudderTop - rudderFoot) * 0.22, zs + 0.52).box(0.075, (rudderTop - rudderFoot) * 0.22, 0.34, 0.03).pop();
    if (q > 0) wood(WALE, 0.7).strut([0, rudderTop - 0.1, zs + 0.3], [0, Math.max(rudderTop + 0.5, gy0 * 0.52), zs + 0.22 + aft(gy0 * 0.52) * 0.5], 0.09, 0.08, round(q, 5));
    if (grand > 1) gilt();
    else black();
    for (const f of [0.25, 0.55, 0.85]) g.push(0, rudderFoot + (rudderTop - rudderFoot) * f, zs + 0.28).box(0.1, 0.035, 0.3, 0.01).pop();

    // ---- the stern: the face she shows to anyone she is running from ----
    const pane = (x: number, y: number, hw: number, hh: number) => light(x, y, sternZ(y), hw, hh, 0, 1, lean(y));
    // her name board, on the sweep of the counter under the lights
    const board = (y: number, half: number) => gilt().push(0, y, sternZ(y) + 0.03, 0, lean(y)).box(half, 0.07, 0.03, 0.01).pop();
    if (!grand) {
        // a working hull: a plank with her name cut in it, and a pair of ports in her counter with their shutters up
        wood(SPAR, 0.7).push(0, gy0 * 0.5, sternZ(gy0 * 0.5) + 0.03, 0, lean(gy0 * 0.5)).box(w0 * 0.5, 0.1, 0.025, 0.01).pop();
        for (const s of [-1, 1]) {
            const y = gy0 * 0.76,
                x = s * w0 * 0.46;
            wood(WALE, 0.75).push(x, y, sternZ(y) + 0.025, 0, lean(y)).box(0.34, 0.27, 0.03, 0.01).pop();
            if (q > 0) {
                wood(SPAR, 0.8).push(x, y, sternZ(y) + 0.05, 0, lean(y)).box(0.29, 0.22, 0.02, 0.006).pop();
                black();
                for (const dx of [-0.17, 0.17]) g.push(x + dx, y + 0.02, sternZ(y + 0.02) + 0.07, 0, lean(y)).box(0.02, 0.21, 0.012, 0.004).pop();
            }
        }
    }
    if (grand === 1) {
        for (let i = -1; i <= 1; i++) pane(i * w0 * 0.56, gy0 * 0.72, w0 * 0.2, 0.38);
        board(gy0 * 0.44, w0 * 0.62);
    }
    if (grand > 1) {
        for (let i = -2; i <= 2; i++) pane(i * w0 * 0.36, gy0 * 0.79, w0 * 0.13, 0.38);
        board(gy0 * 0.43, w0 * 0.55);
        // the stern gallery: a walk across the transom under her lights, on carved brackets
        const gy = gy0 * 0.6,
            gz = sternZ(gy),
            out = 1.15,
            hw = w0 * 0.98;
        wood(CABIN).push(0, gy, gz + out / 2).box(hw, 0.07, out / 2, 0.03).pop();
        for (const x of q > 1 ? [-hw * 0.8, -hw * 0.4, 0, hw * 0.4, hw * 0.8] : [-hw * 0.8, 0, hw * 0.8]) g.strut([x, gy - 0.75, sternZ(gy - 0.75)], [x, gy - 0.06, gz + out * 0.9], 0.09, 0.07, 5);
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
                n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / (q > 1 ? 0.3 : 0.42)));
            for (let i = 0; i <= n; i++) {
                const p = lerp3(a, b, i / n);
                g.push(p[0], p[1] + 0.07, p[2]).cyl(0.04, 0.62, round(q, 5), 0.01, 0.028).pop();
            }
            g.strut([a[0], gy + 0.72, a[2]], [b[0], gy + 0.72, b[2]], 0.05, 0.05, 5);
            g.strut([a[0], gy + 0.02, a[2]], [b[0], gy + 0.02, b[2]], 0.05, 0.05, 5);
        }
        // quarter galleries: a glazed turret on each quarter, where the gallery turns the corner
        for (const s of [-1, 1]) {
            const x = s * (wAt(0.035) * 1.02 + 0.12),
                y = gy0 * 0.67,
                hh = gy0 * 0.17,
                z = sternZ(y) - 1.4;
            wood(CABIN).push(x, y, z).box(0.42, hh, 1.4, 0.1).pop();
            gilt().push(x, y + hh, z).box(0.48, 0.05, 1.46, 0.02).pop();
            g.push(x, y - hh, z).box(0.48, 0.05, 1.46, 0.02).pop();
            g.push(x, y + hh + 0.05, z).cyl(0.36, 0.5, round(q, 8), 0.02, 0.05).pop();
            if (q > 0) g.push(x, y + hh + 0.55, z).sphere(0.09, round(q, 6), 4).pop();
            for (const dz of [-0.68, 0.68]) light(x + s * 0.42, y, z + dz, 0.44, hh * 0.6, s, 0);
            // and under it a carved drop, tapering away into her quarter
            if (q > 0) wood(CABIN).push(x - s * 0.08, y - hh - 0.05, z, 0, PI).cyl(0.36, hh * 1.3, round(q, 7), 0.02, 0.06).pop();
        }
    }
    // the taffrail: a gilded arch over the top of her stern, with a carved board under it on the grandest hulls
    const archH = grand > 1 ? 1.8 : 0.95,
        archW = sideX(0, sternTop),
        archAt = (a: number): Point => [(a * 2 - 1) * archW, sternTop + 0.08 + archH * Math.sin(PI * a), sternZ(sternTop + 0.08 + archH * Math.sin(PI * a)) + 0.02];
    if (grand) {
        const N = q > 1 ? 16 : 10;
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
        const curl = grand > 1 ? archH * 0.27 : 0.24,
            cx = grand > 1 ? archW * 0.42 : w0 * 0.78,
            cy = grand > 1 ? sternTop + archH * 0.42 : gy0 * 0.47,
            turns = q > 1 ? 22 : 11;
        gilt();
        for (const s of [-1, 1])
            for (let k = 0; k < turns; k++) {
                // a spiral: each turn of the stroke a little tighter than the last
                const at = (j: number): Point => {
                    const u = (j * 11) / turns,
                        y = cy + Math.sin(u * 0.62) * curl * (1 - u * 0.07);
                    return [s * (cx + Math.cos(u * 0.62) * curl * (1 - u * 0.07)), y, sternZ(y) + 0.06];
                };
                g.strut(at(k), at(k + 1), 0.04, 0.04, 5);
            }
        // on the grandest, her arms under the arch: a shield between the scrolls, in her colours
        if (grand > 1) {
            const y = sternTop + archH * 0.45;
            paint().push(0, y, sternZ(y) + 0.05, 0, lean(y), 0, archW * 0.16, archH * 0.3, 0.05).sphere(1, round(q, 8), 5).pop();
            gilt().push(0, y + archH * 0.36, sternZ(y + archH * 0.36) + 0.06).sphere(0.16, round(q, 7), 4).pop();
        }
        // scrolls where the arch springs from the rail
        for (const s of [-1, 1]) gilt().push(s * archW, sternTop + 0.12, sternZ(sternTop + 0.12) + 0.02).sphere(0.11 + 0.07 * grand, round(q, 8), 5).pop();
    }
    // stern lanterns: one on a plain hull, three great gilded ones along the taffrail of the grandest
    let sternLamp: Point = [0, sternTop + 1.7, sternZ(sternTop) + 0.3];
    // a stern lantern's glass, in its frame: a cap over it, a foot under it, and bars up its corners
    const greatLamp = (at: Point, big: number) => {
        ironwork().push(at[0], at[1] - 0.34 * big, at[2]).box(0.3 * big, 0.04, 0.3 * big, 0.02).pop();
        g.push(at[0], at[1] + 0.32 * big, at[2]).cyl(0.3 * big, 0.3 * big, round(q, 6), 0.02, 0.04).pop();
        if (q > 0) {
            g.push(at[0], at[1] + 0.62 * big, at[2]).sphere(0.06 * big, 5, 3).pop();
            for (const dx of [-1, 1]) for (const dz of [-1, 1]) g.strut([at[0] + dx * 0.25 * big, at[1] - 0.3 * big, at[2] + dz * 0.25 * big], [at[0] + dx * 0.25 * big, at[1] + 0.32 * big, at[2] + dz * 0.25 * big], 0.022 * big, 0.022 * big, 4);
        }
        lamp(1, 0.72, 0.36, 0.6).push(at[0], at[1], at[2]).box(0.24 * big, 0.3 * big, 0.24 * big, 0.05).pop();
    };
    if (grand > 1) {
        for (const a of [0.2, 0.5, 0.8]) {
            const base = archAt(a),
                big = a === 0.5 ? 1.35 : 1.1,
                at: Point = [base[0], base[1] + 0.95 * big, base[2] + 0.3];
            gilt().strut(base, [at[0], at[1] - 0.3 * big, at[2]], 0.06, 0.05, 5);
            greatLamp(at, big);
            if (a === 0.5) sternLamp = at;
        }
    } else {
        if (grand) sternLamp = [0, sternTop + archH + 1.1, sternZ(sternTop + archH) + 0.3];
        black().strut([0, sternLamp[1] - 1.8, sternZ(sternLamp[1] - 1.8) - 0.05], [0, sternLamp[1] - 0.25, sternLamp[2]], 0.06, 0.05, 5);
        greatLamp(sternLamp, 0.7);
    }

    // ---- masts, yards, tops and rigging (hull/rig.ts) ----
    const rig = buildRig(kit, {
        masts: spec.masts,
        // every mast is stepped on her keel, down through whatever decks are in its way
        step: (z) => kAt(tAt(z)) + 0.25,
        brink,
        open: (t, s) => over(t) < 0 && !(grand && t > TF - HANCE) && !railCut(t, s),
        sternTop,
        sternZ,
    });

    // ---- the head: catheads over her bows with an anchor hung from each, and on a finished hull a
    // figurehead under the bowsprit, carried on gilded rails on the grandest ----
    {
        const k = 0.75 + 0.45 * grand,
            stem = pt(1, 0, gAt(1)),
            foot: Point = [0, stem[1] - 0.75 * k, stem[2] - 0.05],
            chin: Point = [0, stem[1] + 0.05 * k, stem[2] - 1.05 * k];
        for (const s of [-1, 1]) {
            const root = brink(0.87, s),
                end: Point = [root[0] + s * 1.15, root[1] + 0.12, root[2] - 0.2];
            wood(WALE, 0.7).strut([root[0] - s * 0.5, root[1] + 0.05, root[2] + 0.1], end, 0.13, 0.11, round(q, 6));
            if (grand > 1) gilt().push(end[0], end[1], end[2]).sphere(0.16, round(q, 7), 5).pop();
            black().strut([end[0], end[1] - 0.05, end[2]], [end[0], end[1] - 0.3, end[2]], 0.02, 0.02, 4);
            anchor(kit, [end[0], end[1] - 0.3, end[2]], [0, -1, 0], [0, 0, 1], 1.9 + 0.25 * grand);
            if (q > 0) {
                // the hawse hole her cable comes in by, ringed with timber
                const h = on(0.93, gAt(0.93) * 0.74, s, 0.02);
                wood(WALE, 0.7).push(h[0], h[1], h[2], 0, 0, (s * PI) / 2).cyl(0.2, 0.06, round(q, 7), 0.02).pop();
                kit.dark().push(h[0] + s * 0.035, h[1], h[2], 0, 0, (s * PI) / 2).cyl(0.12, 0.04, round(q, 7), 0).pop();
                kit.hemp().strut([h[0] + s * 0.05, h[1], h[2]], [end[0], end[1] - 0.42, end[2]], 0.035, 0.035, 4);
            }
        }
        if (grand) {
            // the figure: a body leaning out from her stem, a head, a crest on it, and arms swept back along the bow
            gilt().strut(foot, chin, 0.24 * k, 0.15 * k, round(q, 8));
            g.push(chin[0], chin[1] + 0.12 * k, chin[2] - 0.1 * k).sphere(0.21 * k, round(q, 9), 6).pop();
            if (q > 0) {
                g.strut([0, chin[1] + 0.3 * k, chin[2] - 0.08 * k], [0, chin[1] + 0.5 * k, chin[2] + 0.22 * k], 0.07 * k, 0.02, 5);
                g.push(0, lerp3(foot, chin, 0.55)[1], lerp3(foot, chin, 0.55)[2] - 0.12 * k).sphere(0.2 * k, round(q, 7), 5).pop();
            }
            // wings swept back along the bow
            for (const s of [-1, 1]) {
                g.strut(lerp3(foot, chin, 0.6), [s * 0.62 * k, stem[1] + 0.1 * k, stem[2] + 0.5 * k], 0.11 * k, 0.03, 5);
                if (q > 1) for (const f of [0.35, 0.6, 0.85]) g.strut(lerp3(lerp3(foot, chin, 0.6), [s * 0.62 * k, stem[1] + 0.1 * k, stem[2] + 0.5 * k], f), [s * (0.3 + 0.4 * f) * k, stem[1] - (0.5 - 0.2 * f) * k, stem[2] + (0.2 + 0.5 * f) * k], 0.05 * k, 0.012, 4);
            }
            // the head: a grating out over the water between her bows and the figure, and a rail swept down to it on each hand
            {
                const yh = stem[1] - 0.5 * k,
                    tip: Point = [0, yh, stem[2] - 0.85 * k],
                    port = on(0.955, yh, -1, 0.02),
                    star2 = on(0.955, yh, 1, 0.02);
                wood(WALE, 0.9);
                for (const seen of [yh - 50, yh + 50]) g.flat([port, star2, tip], 0, seen, 0);
                if (q > 0) {
                    wood(SPAR, 0.85);
                    for (let i = 1; i < 5; i++) g.strut(lerp3(port, tip, i / 5), lerp3(star2, tip, i / 5), 0.03, 0.03, 4);
                }
                gilt();
                for (const s of [-1, 1]) {
                    const from = on(0.9, gAt(0.9) * 0.95, s, 0.04);
                    g.strut(from, lerp3(from, [0, chin[1] + 0.1 * k, chin[2] + 0.25 * k], 0.55), 0.065, 0.055, 5);
                    g.strut(lerp3(from, [0, chin[1] + 0.1 * k, chin[2] + 0.25 * k], 0.55), [0, chin[1] + 0.1 * k, chin[2] + 0.25 * k], 0.055, 0.04, 5);
                }
            }
            if (grand > 1)
                for (const s of [-1, 1])
                    for (const band of [4, -1]) {
                        const row = shellRow(0.857, 1),
                            from = row[band < 0 ? TOP : band * SUB];
                        g.strut([s * (from[0] + 0.05), from[1], from[2]], lerp3(foot, chin, band < 0 ? 0.7 : 0.25), 0.07, 0.05, 5);
                    }
        }
    }

    // What stands on her weather decks that nobody walks through, each a round [x, z, radius, the deck it stands on]; and the holes in them, each [x, z, radius].
    const stands: number[][] = [],
        pits: number[][] = [];
    // ---- the wheel: every ship is steered from one. It stands on the quarterdeck just abaft its rail,
    // or right aft on the main deck of a hull with no deck raised over it: a rim on eight spokes that
    // run on through it as handles, turning a barrel on a stand. The stand is forward of the wheel, so
    // whoever steers stands abaft it with nothing between them and the spokes, looking forward. ----
    let helm: Point = [0, 0, 0];
    {
        const k = grand ? 1 : 0.9,
            wz = zAt(helmT),
            wy = (decksAft ? roofY[0] : dAt(helmT)) + 0.98 * k,
            R = 0.46 * k,
            SPOKES = 8,
            RIM = q > 1 ? 32 : 24;
        helm = [0, wy - 0.98 * k, wz];
        // the stand, and the barrel the tiller ropes wind on
        wood(SPAR, 0.7);
        for (const dz of [0.1, 0.44]) g.push(0, wy - 0.49 * k, wz - dz * k).box(0.13 * k, 0.49 * k, 0.045 * k, 0.015).pop();
        wood(WALE, 0.7).strut([0, wy, wz - 0.44 * k], [0, wy, wz - 0.1 * k], 0.12 * k, 0.12 * k, round(q, 8));
        if (q > 0) {
            // the tiller ropes, down from the barrel through the deck
            kit.hemp();
            for (const s of [-1, 1]) g.strut([s * 0.05, wy - 0.1 * k, wz - 0.27 * k], [s * 0.09, helm[1], wz - 0.27 * k], 0.014, 0.014, 3);
        }
        // rim and spokes
        wood(SPAR, 0.55);
        const rim = (i: number, r: number): Point => [Math.sin((i / RIM) * 2 * PI) * r, wy + Math.cos((i / RIM) * 2 * PI) * r, wz];
        for (let i = 0; i < RIM; i++) g.strut(rim(i, R), rim(i + 1, R), 0.04 * k, 0.04 * k, 5);
        for (let i = 0; i < SPOKES; i++) {
            const a = i * (RIM / SPOKES);
            g.strut(rim(a, 0.06 * k), rim(a, R), 0.028 * k, 0.022 * k, 5);
            g.strut(rim(a, R), rim(a, R + 0.17 * k), 0.03 * k, 0.018 * k, 5);
        }
        // the hub, capped in brass
        if (fine) gilt();
        else g.mat(0.42, 0.9, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]);
        g.strut([0, wy, wz - 0.1 * k], [0, wy, wz + 0.07 * k], 0.1 * k, 0.1 * k, round(q, 8));
        // and the binnacle before it, where whoever steers can see the card
        const bz = wz - 0.44 * k - 0.85;
        binnacle(kit, helm[1], bz);
        stands.push([0, bz, 0.42, helm[1]]);
    }

    // ---- what her decks are worked with (hull/deckware.ts): the hatch and the steps down through it,
    // a grating over her hold, the capstan, pumps at her mainmast and a rail of pins at every mast,
    // bitts forward for her cable; on a finished hull her bell, and on the grandest a boat ----
    if (hatch) {
        buildHatch(kit, hatch, true);
        const a = Math.min(hatch.zTop, hatch.zFoot),
            b = Math.max(hatch.zTop, hatch.zFoot);
        for (let z = a + 0.4; z < b; z += 0.75) pits.push([0, z, 0.85]);
    }
    const hatchLen = clamp(L * 0.05, 1, 2.2),
        hatchWide = Math.min(B * 0.14, 1.5),
        hatchZ = claim(zAt(grand > 1 ? 0.62 : grand ? 0.53 : 0.68), hatchLen * 2 + 0.7, waistFore, waistAft),
        // a finished hull heaves her cable in with a capstan in her waist; a working one has a windlass in her bows instead
        capZ = grand ? claim(zAt(0.41), 2.1, waistFore, waistAft) : null;
    if (hatchZ !== null) {
        const y = dAt(tAt(hatchZ));
        grating(kit, y, hatchZ, hatchWide, hatchLen);
        if (grand > 1) {
            // her boat, stowed over the hatch on a pair of skids
            const len = Math.min(hatchLen * 2 + 2.2, 6.6);
            wood(WALE, 0.8);
            for (const dz of [-0.3, 0.3]) g.push(0, y + 0.27, hatchZ + dz * len).box(hatchWide + 0.2, 0.05, 0.07, 0.015).pop();
            boat(kit, y + 0.3, hatchZ, len);
            for (let z = hatchZ - len / 2 + 0.6; z < hatchZ + len / 2; z += 0.9) stands.push([0, z, len * 0.17 + 0.1, y]);
        } else if (q > 0 && hatchWide + 1.2 < inAt(tAt(hatchZ)) - 1.6) {
            scuttlebutt(kit, hatchWide + 0.6, y, hatchZ);
            stands.push([hatchWide + 0.6, hatchZ, 0.5, y]);
        }
    }
    if (capZ !== null) {
        capstan(kit, dAt(tAt(capZ)), capZ);
        stands.push([0, capZ, 0.58, dAt(tAt(capZ))]);
    }
    if (hatchZ !== null && q > 1) {
        // spare spars lashed down along the hatch: a topmast and a yard, against the day she loses one
        const y = dAt(tAt(hatchZ)),
            len = Math.min(L * 0.24, hatchLen * 2 + 3.4);
        for (const [x, r, lift] of [[-(hatchWide + 0.3), 0.13, 0], [-(hatchWide + 0.58), 0.1, 0], [-(hatchWide + 0.43), 0.085, 0.2]]) {
            wood(SPAR, 0.7).strut([x, y + r + lift, hatchZ + len / 2], [x, y + r * 0.7 + lift, hatchZ - len / 2], r, r * 0.7, round(q, 6));
        }
        kit.hemp();
        for (const f of [-0.32, 0.32]) g.push(-(hatchWide + 0.44), y, hatchZ + f * len).box(0.3, 0.2, 0.025, 0.02).pop();
    }
    // the tallest of her masts is the mainmast: her pumps stand before it
    const main = spec.masts.reduce((a, b) => (b.h > a.h ? b : a));
    spec.masts.forEach((m, i) => {
        const t = tAt(m.z),
            y = floorY(t),
            r = 0.17 + m.h * 0.0075;
        fifeRail(kit, y, m.z + r + 0.55, 0.72);
        for (const x of [-0.72, 0, 0.72]) stands.push([x, m.z + r + 0.55, x ? 0.2 : 0.3, y]);
        if (m === main && y === dAt(t)) {
            pumps(kit, y, m.z - r - 0.4, 0.9);
            for (const s of [-1, 1]) stands.push([s * 0.9, m.z - r - 0.4, 0.27, y]);
        }
        // a lantern on its after side, and a rope or two coiled down at its foot
        if (q > 0) {
            black().strut([0, rig.feet[i][1], m.z + r * 0.8], rig.feet[i], 0.014, 0.014, 4);
            lantern(kit, rig.feet[i], 0.05);
        }
        if (q > 1) for (const s of [-1, 1]) coil(kit, s * 1.25, y, m.z + 0.2, 0.3);
    });
    {
        // riding bitts in her bows; on a finished hull they stand on the forecastle
        const t = 0.885,
            half = Math.min(0.45, inAt(t) - 0.45);
        if (half > 0.2) {
            if (grand) bitts(kit, floorY(t), zAt(t), half);
            else windlass(kit, floorY(t), zAt(t), Math.min(half + 0.25, inAt(t) - 0.35));
            for (const x of grand ? [-half, half] : [-half, 0, half]) stands.push([x, zAt(t), grand ? 0.2 : 0.34, floorY(t)]);
        }
    }
    if (grand) {
        // her bell, at the break of the forecastle
        const z = pt(TF, 0, fcY)[2] - 0.5;
        belfry(kit, fcY, z);
        stands.push([0, z, 0.4, fcY]);
        // and the galley's chimney coming up through that deck
        if (q > 0) {
            black().push(1.1, fcY, z - 1.3).cyl(0.11, 0.85, round(q, 7), 0.01).pop();
            g.push(1.1, fcY + 0.85, z - 1.3).cyl(0.17, 0.12, round(q, 7), 0.02, 0.1).pop();
            stands.push([1.1, z - 1.3, 0.25, fcY]);
        }
    }
    if (decksAft) {
        // a skylight over the cabin, between the wheel and whatever is built abaft it
        const from = zAt(helmT) + 1.9,
            to = decksAft > 1 ? pt(reach(1), 0, roofY[1])[2] - STOREY * PITCH - 0.9 : sternZ(roofY[0]) - 1.3,
            hl = Math.min(1.1, (to - from) / 2 - 0.1);
        if (hl > 0.5 && !spec.masts.some((m) => m.z > from - 0.6 && m.z < from + 2 * hl + 1.6)) {
            skylight(kit, roofY[0], from + hl, 0.6, hl);
            for (let z = from + 0.3; z < from + 2 * hl; z += 0.6) stands.push([0, z, 0.62, roofY[0]]);
        }
    }
    if (q > 0)
        // shot to hand in a rack by every long gun on her open deck, and a bucket of water for the sponge
        for (const s of [-1, 1]) {
            if (arms[sideOf(s)] !== 0) continue;
            for (const t of stations[sideOf(s)]) {
                if (!open(t, s) || !open(t - 1.5 / L, s)) continue;
                shotRack(kit, s * (inAt(t) - 0.16), dAt(t), zAt(t) + 0.62, 4, s);
                if (q > 1) bucket(kit, s * (inAt(t) - 0.3), dAt(t), zAt(t) - 0.75);
                if (q > 2) {
                    // her rammer and her sponge, racked along the bulwark over the shot; and a handspike to train her with
                    const x = s * (inAt(t) - 0.13),
                        z = zAt(t) + 0.5;
                    wood(SPAR, 0.7);
                    g.strut([x, dAt(t) + 0.74, z], [x, dAt(t) + 0.74, z + 1.75], 0.022, 0.022, 5);
                    g.strut([x, dAt(t) + 0.86, z], [x, dAt(t) + 0.86, z + 1.75], 0.022, 0.022, 5);
                    g.strut([x, dAt(t) + 0.74, z + 1.75], [x, dAt(t) + 0.74, z + 1.93], 0.06, 0.06, 6);
                    plain([0.16, 0.15, 0.14], 0.95).strut([x, dAt(t) + 0.86, z + 1.75], [x, dAt(t) + 0.86, z + 2], 0.07, 0.07, 6);
                    wood(SPAR, 0.7).strut([s * (inAt(t) - 0.22), dAt(t) + 0.03, zAt(t) - 0.5], [s * (inAt(t) - 0.08), dAt(t) + 0.95, zAt(t) - 1.25], 0.035, 0.025, 5);
                    black();
                    for (const dz of [0.35, 1.4]) g.push(x + s * 0.04, dAt(t) + 0.8, z + dz).box(0.02, 0.1, 0.02, 0.004).pop();
                }
            }
        }
    if (q > 1)
        // a rail of belaying pins inside her bulwark abreast of every mast, where the braces and the halyards come down
        for (const m of spec.masts) {
            const t = tAt(m.z + 0.9);
            for (const s of [-1, 1]) {
                if (!open(t, s) || !open(tAt(m.z - 0.3), s) || !open(tAt(m.z + 2.1), s) || gunAt(t, s, 1.3)) continue;
                const x = s * (inAt(t) - 0.11),
                    y = gAt(t) - 0.2;
                wood(WALE, 0.7).push(x, y, zAt(t)).box(0.08, 0.035, 1, 0.012).pop();
                for (let i = 0; i < 6; i++) {
                    wood(SPAR, 0.6).push(x, y - 0.14, zAt(t) - 0.8 + i * 0.32).cyl(0.016, 0.36, 5, 0.004, 0.022).pop();
                    if (i % 2) kit.hemp().push(x - s * 0.02, y - 0.42, zAt(t) - 0.8 + i * 0.32, PI / 2, PI / 2).cyl(0.11, 0.035, round(q, 7), 0.01).pop();
                }
            }
        }

    // ---- guns: each battery as its mount builds it (hull/mounts.ts), and under it a shorter tier for
    // each gun deck, standing on that deck and firing through ports in her side ----
    const muzzles: [Point[], Point[]] = [[], []],
        lowerGuns: { t: number; s: number; reach: number }[] = [];
    for (const s of [-1, 1]) {
        const si = sideOf(s),
            mount = mounts[si],
            upper = stations[si];
        for (let tier = 0; tier <= decks; tier++) {
            const n = tier ? Math.ceil(upper.length / 2) : upper.length;
            for (let i = 0; i < n; i++) {
                const t = tier ? 0.24 + ((i + 0.5) / n) * 0.46 : upper[i],
                    // an upper-deck gun under her quarterdeck stands on the cabin's floor, and is fought from in there
                    floor = tier ? gunFloor - (tier - 1) * TWEEN : decksAft && t < T0 ? cabinY : dAt(t),
                    y = floor + (tier ? 0.4 * mount.calibre + 0.02 : 0.42),
                    x = tier ? outX(t, y) : wAt(t) * 0.97,
                    z = zAt(t),
                    cut = tier ? undefined : railCut(t, s),
                    at = (u: number, v: number, w = 0): Point => [s * (x + u), v, z + w];
                const site: GunSite = {
                    t,
                    s,
                    x,
                    y,
                    z,
                    deck: floor,
                    rail: gAt(t),
                    half: cut ? ((cut.t1 - cut.t0) * L) / 2 : ((0.46 / n) * L) / 2,
                    at,
                    block: (u0, u1, v0, v1, w, hw) => g.push(...(at((u0 + u1) / 2, (v0 + v1) / 2, w) as [number, number, number])).box((u1 - u0) / 2, (v1 - v0) / 2, hw, 0).pop(),
                };
                if (tier) {
                    // on the deck it stands on it is seen only by lamplight
                    const lit = inside && tier <= floors.length;
                    if (lit) g.ao = 0.24;
                    muzzles[si].push(lowerGun(kit, site, mount.calibre, lit));
                    g.ao = 1;
                    if (tier === 1) lowerGuns.push({ t, s, reach: 1.55 * mount.calibre });
                } else muzzles[si].push(mount.gun(kit, site));
            }
        }
    }

    // ---- the decks below (hull/below.ts) ----
    const tweens = buildBelow(kit, {
        floors,
        ta: HOLD_AFT,
        tb: HOLD_FORE,
        over: (t) => {
            // the underside of her cabin's floor abaft its bulkhead, and of her open deck before it
            if (!decksAft) return dAt(t) - THICK;
            const f = clamp((t - T0) * L * 40 + 0.5, 0, 1);
            return cabinY - THICK + (dAt(Math.max(t, T0)) - cabinY) * f;
        },
        step: decksAft ? zAt(T0) : null,
        flights,
        masts: spec.masts.map((m) => m.z),
        gunDeck: decks > 0 ? 0 : -1,
        guns: lowerGuns,
        inside,
    });

    // ---- where a person can stand: every deck from her taffrail to her bows, inside her bulwarks ----
    const walk = { t0: 0.02, t1: 0.95, y: [] as number[], w: [] as number[], raised, stands, pits };
    for (let i = 0; i <= 60; i++) {
        const t = walk.t0 + ((walk.t1 - walk.t0) * i) / 60,
            y = floorY(t);
        walk.y.push(dAt(t));
        walk.w.push(Math.max(0, (y > dAt(t) + 0.01 ? sideX(t, y) - 0.13 : inAt(t)) - 0.24));
    }
    // she is kept dry inside wherever a deck of hers lies near or under the waterline
    const dry = tweens.length && tweens[tweens.length - 1].y < 0.9 ? [zAt(HOLD_FORE) - 0.06, zAt(HOLD_AFT) + 0.06] : null;

    return {
        geo: g,
        model: {
            len: L, beam: B, draft: D, deck: dAt(0.5), walk, helm, rail: gAt(0.5), masts: spec.masts.map((mast) => mast.z),
            sails: rig.sails, jibs: rig.jibs, pennants: rig.pennants,
            guns: [muzzles[0].length, muzzles[1].length], muzzles,
            posts: [stations[0].length, stations[1].length],
            inside: [0, 1].map((si) => (decksAft ? stations[si].filter((t) => t < T0).length : 0)) as [number, number],
            cabin, tweens, flights, dry, flag: rig.flag, lantern: sternLamp,
        },
    };
}

/** Points across and down the grid a sigil is laid on the unit sail by. */
const NU = 15,
    NV = 10;
// A point of the unit sail: bent to its yard along y = 0 and hanging to -1, one unit wide at the foot,
// full of wind. `u` runs across it from leech to leech and `v` down it from the head.
// Cut like a real square sail: narrower at the head than the foot, hollow in the leeches, arched in
// the foot, and deepest a little below the middle, with each cloth swelling between its seams.
const sailAt = (u: number, v: number): Point => {
    const arc = Math.sin(PI * u),
        half = (0.43 + 0.07 * Math.pow(v, 0.8)) * (1 - 0.035 * Math.sin(PI * v)),
        belly = 0.22 * Math.pow(arc, 0.85) * Math.sin(PI * 0.8 * Math.pow(v, 0.7)) + 0.012 * Math.abs(Math.sin(PI * u * 5)) * Math.sin(PI * v);
    return [(u * 2 - 1) * half, -v * (1 - 0.1 * arc * v * v), -belly];
};
// the unit sail as a grid of points (across the sail first, then down it), and the way the cloth faces at each
const sailCloth = (nu: number, nv: number) => {
    const cloth: Point[][] = [];
    for (let j = 0; j <= nu; j++) {
        const col: Point[] = [];
        for (let i = 0; i <= nv; i++) col.push(sailAt(j / nu, i / nv));
        cloth.push(col);
    }
    return { cloth, front: gridNormals(cloth, () => [0, 0, -1]) };
};
let sailGrid: { cloth: Point[][]; front: Point[][] } | null = null;
/** The unit sail's surface as sigils are laid on it. */
const sailSurface = () => (sailGrid ??= sailCloth(NU, NV));

const sailMeshes: (Mesh | undefined)[] = [];
/**
 * The unit sail at a level of detail, 0 .. 3: the same sail at every level, cut in more cloths the
 * finer it is, and from level 2 with its reef points hanging in two rows across it. Built the
 * first time it is asked for.
 */
export function sailMesh(detail: number): Mesh {
    const q = clamp(Math.round(detail), 0, 3);
    let mesh = sailMeshes[q];
    if (mesh) return mesh;
    const nu = [15, 15, 25, 35][q],
        nv = [10, 10, 20, 30][q],
        { cloth, front } = sailCloth(nu, nv),
        back = front.map((r) => r.map((n) => [-n[0], -n[1], -n[2]])),
        g = new Geo();
    g.mat(0.95, 0, 0, MATERIAL.CLOTH);
    // the foot and the leeches are free to shiver; the head is bent to the yard
    const shiver = (u: number, v: number) => v * 0.3 * (0.65 + 0.35 * Math.abs(u * 2 - 1)),
        flutter = (j: number, i: number) => shiver(j / nu, i / nv),
        // the reef bands: a strip of doubled cloth across the sail, a quarter and a half of the way down
        band = nv > 10 ? 0.05 : 0.1,
        REEFS = [0.3, 0.5];
    // The grid runs across the sail first, so that skinning a range of "columns" lays one band from
    // leech to leech: that is how the cloth is shaded darker toward the foot and along its reef bands.
    for (let i = 0; i < nv; i++) {
        const v = (i + 0.5) / nv,
            // weathered toward the foot, and doubled (so darker) along the two reef bands
            k = (1 - 0.12 * (i / nv)) * (REEFS.some((r) => v < r && v > r - band) ? 0.88 : 1);
        g.col(0.93 * k, 0.9 * k, 0.8 * k);
        g.skin(cloth, front, i, i + 1, flutter);
        g.skin(cloth, back, i, i + 1, flutter);
    }
    if (q > 1) {
        // reef points: a short line through the sail at every cloth of each band, hanging on both faces of it
        g.col(0.74, 0.7, 0.6);
        const N = q > 2 ? 32 : 22;
        for (const v of REEFS)
            for (let n = 1; n < N; n++) {
                const u = n / N,
                    p = sailAt(u, v - band * 0.4);
                g.sway = shiver(u, v);
                for (const face of [-1, 1]) g.strut([p[0], p[1], p[2] + face * 0.004], [p[0], p[1] - 0.034, p[2] + face * 0.006], 0.0013, 0.0009, 3);
            }
        g.sway = 0;
    }
    return (sailMeshes[q] = mesh = registerMesh(g));
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

    // ---- unit sail: see sailMesh(). The one kept here is what anything that does not care how finely it is cut draws ----
    M.sail = sailMesh(1);

    // ---- unit jib: a triangle with its tack at the origin, its luff up +Y and its foot along +Z, each one
    // unit long, bellying out to +X. An instance's matrix lays those three axes along a real sail. ----
    const N = 6;
    let g = new Geo();
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

    // ---- unit rope: a round of radius one standing one unit up +Y, painted, so that an instance draws
    // it out along any line in whatever colour it is given: a harpoon's line, and the iron on the end of it ----
    g = new Geo();
    g.mat(0.9, 0, 0, MATERIAL.PAINT).col(1, 1, 1).cyl(1, 1, 5, 0);
    M.rope = registerMesh(g);

    // ---- unit gangway: a board a metre wide standing one unit up +Y, with a batten across it at every
    // tenth, to be laid from a ship's rail down to a wharf ----
    g = new Geo();
    g.mat(0.9, 0, 0, MATERIAL.WOOD).col(SKINS[0].deck[0], SKINS[0].deck[1], SKINS[0].deck[2]).push(0, 0.5, 0).box(0.5, 0.5, 0.035, 0).pop();
    g.col(SKINS[0].tar[0], SKINS[0].tar[1], SKINS[0].tar[2]);
    for (let i = 1; i < 10; i++) for (const side of [-0.05, 0.05]) g.push(0, i / 10, side).box(0.5, 0.006, 0.02, 0).pop();
    M.gangway = registerMesh(g);
}
