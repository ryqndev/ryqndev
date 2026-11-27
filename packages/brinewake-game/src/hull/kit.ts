// What a hull under construction offers to whatever is built onto it. The hull builder (models.ts)
// makes one kit per hull and hands it to each part that is not its own business: her armament
// (mounts.ts), her masts and rigging (rig.ts), what stands on her deck (deckware.ts), her stairs
// (stairs.ts) and the decks below (below.ts). A new kind of part takes the same kit, so it can be
// written without knowing how a hull is lofted.
import type { Geo, Point } from '@ryqndev/brinewake-renderer';

export interface HullKit {
    /** the mesh being built: bow at -Z, waterline at y = 0 */
    g: Geo;
    /** her length and beam, metres */
    L: number;
    B: number;
    /** how richly she is finished: 0 a plain working hull, 1 painted and gilded, 2 a floating palace */
    grand: number;
    /** gilded, by her build or by her finish */
    fine: boolean;
    /**
     * How finely this mesh of her is being built, 0 .. 3: the graphics setting, less for a ship far
     * off. It changes what is drawn and how round, never where anything is: every measurement of a
     * hull is the same at every level.
     */
    q: number;
    /** timbers of her finish: spars and joinery, what stands proud of her planking, her decks, her planking and her cabins */
    spar: number[];
    wale: number[];
    deck: number[];
    plank: number[];
    cabin: number[];
    // ---- each sets the material and colour for whatever is drawn next ----
    wood(c: number[], rough?: number): Geo;
    /** gunmetal */
    iron(): Geo;
    gilt(): Geo;
    /** painted work, which takes the ship's own colours */
    paint(): Geo;
    /** the inside of a bore: nothing comes back out of it */
    dark(): Geo;
    hemp(): Geo;
    /** tarred rope: her standing rigging */
    tarred(): Geo;
    /** untinted, unseamed stuff: paper, linen, glass, wrought iron */
    plain(c: number[], rough?: number, metal?: number): Geo;
    /** fittings: brass on a finished hull, black iron on a plain one */
    ironwork(): Geo;
    /** a lit pane or a flame, by its colour and how brightly it glows after dark */
    lamp(r: number, g: number, b: number, e: number): Geo;
    /** a point on her side at station `t` (0 stern .. 1 bow) and height `y`, stood off it by `out` metres; `s` is -1 to port, 1 to starboard */
    on(t: number, y: number, s: number, out?: number): Point;
    // ---- her lines: `t` runs 0 at her stern to 1 at her bow, z runs aft ----
    zAt(t: number): number;
    tAt(z: number): number;
    /** half her beam at a station, her gunwale, her open deck and her keel there */
    wAt(t: number): number;
    gAt(t: number): number;
    dAt(t: number): number;
    kAt(t: number): number;
    /** how far out her side stands at a station and a height */
    outX(t: number, y: number): number;
    /** a point of her: `x` off her centreline at height `y`, with the rake of her stem and stern taken in */
    pt(t: number, x: number, y: number): Point;
}

/** How many sides a round thing is given at a level of detail: `n` at the level hulls were first drawn at, fewer below it and more above. */
export const round = (q: number, n: number) => Math.max(3, Math.round(n * [0.75, 1, 1.5, 2.25][q]));

/** One gun's place in a battery, and the means to build at it. */
export interface GunSite {
    /** station along her (0 stern .. 1 bow), and which side: -1 port, 1 starboard */
    t: number;
    s: number;
    /** how far out her side stands here, the height of a long gun's bore, and where along her it is */
    x: number;
    y: number;
    z: number;
    /** her deck here, and the top of her bulwark as it would be uncut */
    deck: number;
    rail: number;
    /** half the room this gun has along her side, metres: half the width of what was cut for it, where her bulwark was cut */
    half: number;
    /** a point `u` metres outboard of her side (negative: inboard), at height `v`, `w` metres aft of the gun */
    at(u: number, v: number, w?: number): Point;
    /** a square timber between two distances outboard and two heights, `hw` half-wide, `w` metres aft of the gun */
    block(u0: number, u1: number, v0: number, v1: number, w: number, hw: number): void;
}

/**
 * A flight of steps between two of her decks. It runs fore and aft in a lane of its own; whoever
 * walks her goes onto it over the end that stands on the deck they are on, and nowhere else.
 * Lengths are the hull's own metres, with z running aft.
 */
export interface Flight {
    /** the lane it runs in, across her */
    x0: number;
    x1: number;
    /** where along her its head and its foot stand, and how high each is */
    zTop: number;
    zFoot: number;
    yTop: number;
    yFoot: number;
    /** the tier each end stands on: 0 her weather decks, n the nth deck below them */
    top: number;
    foot: number;
}

/**
 * A deck below her weather deck: a level floor from one bulkhead to another, within her sides.
 * Lengths are the hull's own metres, with z running aft.
 */
export interface Tween {
    /** its floor, and the underside of the deck over it */
    y: number;
    head: number;
    /** the bulkheads that end it: forward, then aft */
    z0: number;
    z1: number;
    /** how far either side of her centreline someone can stand, sampled evenly from z0 to z1 */
    w: number[];
    /** what stands on its floor that nobody walks through, each as [x0, x1, z0, z1] */
    blocks: number[][];
    /** where its lamps hang */
    lamps: Point[];
}
