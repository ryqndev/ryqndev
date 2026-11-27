// What a hull under construction offers to whatever is built onto it. The hull builder (models.ts)
// makes one kit per hull and hands it to each part that is not its own business: today that is her
// armament (mounts.ts). A new kind of part takes the same kit, so it can be written without
// knowing how a hull is lofted.
import type { Geo, Point } from '@ryqndev/brinewake-renderer';

export interface HullKit {
    /** the mesh being built: bow at -Z, waterline at y = 0 */
    g: Geo;
    /** her length, metres */
    L: number;
    /** how richly she is finished: 0 a plain working hull, 1 painted and gilded, 2 a floating palace */
    grand: number;
    /** timbers of her finish: spars and joinery, what stands proud of her planking, and her decks */
    spar: number[];
    wale: number[];
    deck: number[];
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
    /** a point on her side at station `t` (0 stern .. 1 bow) and height `y`, stood off it by `out` metres; `s` is -1 to port, 1 to starboard */
    on(t: number, y: number, s: number, out?: number): Point;
}

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
