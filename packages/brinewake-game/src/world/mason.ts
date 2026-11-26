import { type Geo, gridNormals, MATERIAL, type Point, ROUND_SCALE } from '@ryqndev/brinewake-renderer';
import { clamp, PI, TAU } from '@ryqndev/kiln-math';

import type { WorldLight } from './types';

export type Rgb = number[];

/** The town's palette. Colours are stored as the shader squares them, so these read lighter than they render. */
export const C = {
    STONE: [0.56, 0.54, 0.5],
    PALE: [0.74, 0.72, 0.66],
    DARKSTONE: [0.42, 0.41, 0.4],
    TIMBER: [0.42, 0.3, 0.19],
    DARK: [0.25, 0.18, 0.12],
    PLANK: [0.54, 0.42, 0.28],
    IRON: [0.11, 0.11, 0.12],
    GLASS: [0.06, 0.08, 0.1],
    LAMP: [1, 0.74, 0.4],
    ROPE: [0.52, 0.44, 0.3],
    BURLAP: [0.58, 0.49, 0.32],
    CANVAS: [0.84, 0.8, 0.68],
    THATCH: [0.62, 0.52, 0.3],
};
export const PLASTERS: Rgb[] = [
    [0.88, 0.83, 0.7],
    [0.92, 0.89, 0.8],
    [0.86, 0.68, 0.46],
    [0.84, 0.58, 0.46],
    [0.7, 0.78, 0.76],
    [0.9, 0.76, 0.5],
    [0.8, 0.72, 0.6],
    [0.86, 0.64, 0.56],
    [0.76, 0.8, 0.66],
];
export const SHUTTERS: Rgb[] = [
    [0.16, 0.32, 0.36],
    [0.34, 0.16, 0.12],
    [0.15, 0.28, 0.17],
    [0.22, 0.24, 0.4],
    [0.4, 0.32, 0.14],
];
export const TILES: Rgb[] = [
    [0.66, 0.32, 0.2],
    [0.6, 0.27, 0.17],
    [0.7, 0.4, 0.25],
];

export interface RoofOptions {
    /** slopes on all four sides rather than gables at the ends */
    hip?: boolean;
    /** the ridge runs front to back, putting a gable over the front wall */
    along?: boolean;
    /** rise per metre of run */
    pitch?: number;
    /** how far the eaves oversail the walls */
    over?: number;
    tile?: Rgb;
    /** colour of the gable walls: plastered, or boarded when `timber` is given instead */
    wall?: Rgb;
    timber?: Rgb;
    /** palm thatch rather than tiles */
    thatch?: boolean;
}

/**
 * A builder's kit over a Geo: materials, masonry, joinery and the furniture of a port. Everything is
 * laid out in whatever frame the Geo's transform stack is in.
 */
export class Mason {
    /** the level the thing being built stands on, for contact shading; null reads the terrain */
    floor: number | null = null;
    /** lamps hung so far, in world space */
    lights: WorldLight[] = [];

    constructor(
        readonly G: Geo,
        readonly R: () => number,
        ground: (x: number, z: number) => number
    ) {
        G.aoFn = (x, y, z) => 0.5 + 0.5 * clamp((y - (this.floor ?? Math.max(ground(x, z), 0))) / 2.4, 0, 1);
    }

    rr(a: number, b: number) {
        return a + this.R() * (b - a);
    }
    pick<T>(list: T[]): T {
        return list[(this.R() * list.length) | 0];
    }
    /** A point in the current frame, in world space. */
    world(x: number, y: number, z: number): Point {
        const m = this.G.st[this.G.st.length - 1].m;
        return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
    }

    // ---- materials: `round` is the radius of a tower, so courses wrap it ----
    private masonry(kind: number, c: Rgb, round: number) {
        this.G.mat(0.9, round > 0 ? 1 : 0, round / ROUND_SCALE, kind).col(c[0], c[1], c[2]);
        return this;
    }
    stone(c: Rgb = C.STONE, round = 0) {
        return this.masonry(MATERIAL.STONE, c, round);
    }
    plaster(c: Rgb, round = 0) {
        return this.masonry(MATERIAL.PLASTER, c, round);
    }
    tile(c: Rgb = TILES[0], round = 0) {
        return this.masonry(MATERIAL.TILE, c, round);
    }
    wood(c: Rgb = C.TIMBER, rough = 0.85) {
        this.G.mat(rough, 0, 0, MATERIAL.WOOD).col(c[0], c[1], c[2]);
        return this;
    }
    paint(c: Rgb, rough = 0.8) {
        this.G.mat(rough, 0, 0, MATERIAL.PAINT).col(c[0], c[1], c[2]);
        return this;
    }
    /** untinted, unpatterned matte: skin, rope, fruit */
    matte(c: Rgb, rough = 0.85) {
        this.G.mat(rough, 0, 0, MATERIAL.METAL).col(c[0], c[1], c[2]);
        return this;
    }
    iron(c: Rgb = C.IRON) {
        this.G.mat(0.5, 0.8, 0, MATERIAL.METAL).col(c[0], c[1], c[2]);
        return this;
    }
    cloth(c: Rgb) {
        this.G.mat(0.95, 0, 0, MATERIAL.CLOTH).col(c[0], c[1], c[2]);
        return this;
    }
    leaf(c: Rgb) {
        this.G.mat(0.7, 0, 0, MATERIAL.LEAF).col(c[0], c[1], c[2]);
        return this;
    }
    glow(c: Rgb = C.LAMP, e = 0.45) {
        this.G.mat(0.3, 0, e, MATERIAL.EMISSIVE).col(c[0], c[1], c[2]);
        return this;
    }

    // ---- solids ----
    /** A box by its extents. */
    slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, bv = 0) {
        this.G.push((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
            .box(Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2, bv)
            .pop();
        return this;
    }
    /** An upright round post standing on (x, y, z). */
    post(x: number, y: number, z: number, r: number, h: number, seg = 6, r2 = r) {
        this.G.push(x, y, z).cyl(r, h, seg, 0.02, r2).pop();
        return this;
    }
    beam(a: Point, b: Point, r: number, r2 = r, seg = 5) {
        this.G.strut(a, b, r, r2, seg);
        return this;
    }
    /** Flat-sided solid between two outlines given as [x, z] rings of equal length, capped on top. `inward` faces its sides in. */
    prism(base: number[][], top: number[][], y0: number, y1: number, cap = true, inward = false) {
        const G = this.G,
            n = base.length;
        let cx = 0,
            cz = 0;
        for (const p of base) {
            cx += p[0] / n;
            cz += p[1] / n;
        }
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            // facing out from the middle; or, for the inside of a basin, from a point beyond the face
            const k = inward ? 2 : 0,
                mx = ((base[i][0] + base[j][0]) / 2) * k + cx * (1 - k),
                mz = ((base[i][1] + base[j][1]) / 2) * k + cz * (1 - k);
            G.flat([[base[i][0], y0, base[i][1]], [base[j][0], y0, base[j][1]], [top[j][0], y1, top[j][1]], [top[i][0], y1, top[i][1]]], mx, (y0 + y1) / 2, mz);
        }
        if (cap) for (let i = 0; i < n; i++) G.flat([[cx, y1, cz], [top[i][0], y1, top[i][1]], [top[(i + 1) % n][0], y1, top[(i + 1) % n][1]]], cx, y1 - 9, cz);
        return this;
    }
    /** A regular polygon ring of [x, z] points about (x, z). */
    ngon(x: number, z: number, r: number, n: number, turn = 0): number[][] {
        const out: number[][] = [];
        for (let i = 0; i < n; i++) out.push([x + Math.cos((i / n) * TAU + turn) * r, z + Math.sin((i / n) * TAU + turn) * r]);
        return out;
    }
    /** A two-sided sheet of cloth (3 or 4 corners); `w` is how far the wind moves each corner. */
    sheet(p: Point[], w: number[]) {
        const G = this.G,
            [a, b, c] = p;
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const nx = uy * vz - uz * vy,
            ny = uz * vx - ux * vz,
            nz = ux * vy - uy * vx;
        for (const s of [1, -1]) {
            const id = p.map((q, i) => G.vert(q[0], q[1], q[2], nx * s, ny * s, nz * s, w[i]));
            G.tri(id[0], id[1], id[2]);
            if (id.length > 3) G.tri(id[0], id[2], id[3]);
        }
        return this;
    }
    /** A flag or pennant streaming along +X from its hoist at (x, y, z), `len` long and `drop` deep. */
    flag(x: number, y: number, z: number, len: number, drop: number, c: Rgb, c2: Rgb = c, taper = 1) {
        const N = 5;
        for (let i = 0; i < N; i++) {
            const a = i / N,
                b = (i + 1) / N,
                da = (drop * (1 - (1 - taper) * a)) / 2,
                db = (drop * (1 - (1 - taper) * b)) / 2;
            this.cloth(i % 2 ? c2 : c).sheet([[x + a * len, y + da, z], [x + b * len, y + db, z], [x + b * len, y - db, z], [x + a * len, y - da, z]], [a, b, b, a]);
        }
        return this;
    }

    // ---- lamps ----
    /** Hangs a lantern at a point and lights it after dark. */
    lantern(x: number, y: number, z: number, rad = 26, k = 1) {
        this.iron().slab(x - 0.14, x + 0.14, y + 0.24, y + 0.3, z - 0.14, z + 0.14);
        this.glow(C.LAMP, 0.5).slab(x - 0.11, x + 0.11, y - 0.14, y + 0.24, z - 0.11, z + 0.11, 0.03);
        const [wx, wy, wz] = this.world(x, y, z);
        this.lights.push({ x: wx, y: wy, z: wz, r: 9 * k, g: 5.4 * k, b: 2.2 * k, rad, glow: 1.2 });
        return this;
    }
    /** An iron lamp standard with its lantern on a bracket. */
    lampPost(x: number, y: number, z: number, h = 3.4, arm = 0.5) {
        this.iron().post(x, y, z, 0.07, h, 5, 0.05).beam([x, y + h - 0.15, z], [x + arm, y + h + 0.1, z], 0.035);
        this.stone(C.DARKSTONE).slab(x - 0.16, x + 0.16, y, y + 0.3, z - 0.16, z + 0.16, 0.03);
        return this.lantern(x + arm, y + h - 0.25, z);
    }

    // ---- joinery, in the frame of a wall: x along it, y up, -Z outward ----
    /** Enters the frame of one wall of a block hw x hd (0 front, 1 right, 2 back, 3 left) and returns its half-width. */
    face(side: number, hw: number, hd: number) {
        const G = this.G;
        if (side === 0) G.push(0, 0, -hd);
        else if (side === 1) G.push(hw, 0, 0, -PI / 2);
        else if (side === 2) G.push(0, 0, hd, PI);
        else G.push(-hw, 0, 0, PI / 2);
        return side & 1 ? hd : hw;
    }
    window(x: number, y: number, w: number, h: number, shut: Rgb | null = null, lit = this.R() < 0.5) {
        const a = w / 2,
            b = h / 2;
        this.wood(C.DARK, 0.7).slab(x - a - 0.08, x + a + 0.08, y - b - 0.08, y + b + 0.08, -0.05, 0.02);
        if (lit) this.glow(C.LAMP, this.rr(0.25, 0.5));
        else this.paint(C.GLASS, 0.1);
        this.slab(x - a, x + a, y - b, y + b, -0.07, 0);
        this.wood(C.DARK, 0.7)
            .slab(x - 0.03, x + 0.03, y - b, y + b, -0.1, -0.06)
            .slab(x - a, x + a, y + b * 0.2 - 0.03, y + b * 0.2 + 0.03, -0.1, -0.06);
        this.stone(C.PALE).slab(x - a - 0.16, x + a + 0.16, y - b - 0.2, y - b - 0.08, -0.18, 0.02);
        if (shut) {
            this.paint(shut, 0.75);
            for (const s of [-1, 1]) {
                const x0 = x + s * (a + 0.1),
                    x1 = x0 + s * (a - 0.02);
                this.slab(Math.min(x0, x1), Math.max(x0, x1), y - b, y + b, -0.07, 0);
            }
        }
        return this;
    }
    /** A plank door standing on y, in a stone surround, with a step down to the street. */
    door(x: number, y: number, w: number, h: number, c: Rgb = C.DARK) {
        const a = w / 2;
        this.stone(C.PALE).slab(x - a - 0.18, x + a + 0.18, y, y + h + 0.2, -0.07, 0.02);
        this.wood(c, 0.8).slab(x - a, x + a, y, y + h, -0.11, 0);
        this.iron().slab(x + a - 0.26, x + a - 0.16, y + h * 0.45, y + h * 0.45 + 0.1, -0.16, -0.1);
        this.stone().slab(x - a - 0.35, x + a + 0.35, y - 0.6, y, -0.75, 0, 0.03);
        return this;
    }
    /** A timber balcony on brackets, railed on three sides. */
    balcony(x: number, y: number, w: number, d: number, c: Rgb = C.TIMBER) {
        const a = w / 2;
        this.wood(c).slab(x - a, x + a, y - 0.12, y, -d, 0);
        for (const s of [-1, 0, 1]) this.beam([x + s * (a - 0.15), y - 0.9, 0], [x + s * (a - 0.15), y - 0.12, -d + 0.1], 0.06);
        this.rail([x - a + 0.05, y, 0], [x - a + 0.05, y, -d + 0.05]);
        this.rail([x - a + 0.05, y, -d + 0.05], [x + a - 0.05, y, -d + 0.05]);
        this.rail([x + a - 0.05, y, -d + 0.05], [x + a - 0.05, y, 0]);
        return this;
    }
    /** A handrail on balusters between two points at floor level. */
    rail(a: Point, b: Point, h = 0.95, gap = 0.45, r = 0.035) {
        const len = Math.hypot(b[0] - a[0], b[2] - a[2]),
            n = Math.max(1, Math.round(len / gap));
        this.beam([a[0], a[1] + h, a[2]], [b[0], b[1] + h, b[2]], r * 1.5, r * 1.5, 4);
        for (let i = 0; i <= n; i++) {
            const t = i / n,
                x = a[0] + (b[0] - a[0]) * t,
                y = a[1] + (b[1] - a[1]) * t,
                z = a[2] + (b[2] - a[2]) * t;
            this.G.push(x, y, z).cyl(i % 4 ? r : r * 1.8, h, 4, 0).pop();
        }
        return this;
    }
    /** A striped awning slung out from a wall, its outer edge on two poles. */
    awning(x: number, y: number, w: number, d: number, c1: Rgb, c2: Rgb = C.CANVAS, drop = 0.8) {
        const n = Math.max(2, Math.round(w / 0.7)),
            x0 = x - w / 2;
        for (let i = 0; i < n; i++) {
            const a = x0 + (i / n) * w,
                b = x0 + ((i + 1) / n) * w;
            this.cloth(i % 2 ? c2 : c1).sheet([[a, y, 0], [b, y, 0], [b, y - drop, -d], [a, y - drop, -d]], [0, 0, 0.1, 0.1]);
            // the scalloped valance
            this.sheet([[a, y - drop, -d], [b, y - drop, -d], [(a + b) / 2, y - drop - 0.32, -d]], [0.1, 0.1, 0.35]);
        }
        this.wood(C.DARK);
        for (const s of [-1, 1]) this.beam([x + s * (w / 2 - 0.05), y - drop - 2.1, -d], [x + s * (w / 2 - 0.05), y - drop, -d], 0.045, 0.045, 4);
        return this;
    }

    // ---- roofs ----
    /** A tiled roof over a block hw x hd whose walls stop at y. Returns the height of its ridge. */
    roof(hw: number, hd: number, y: number, o: RoofOptions = {}): number {
        const G = this.G,
            { hip = false, along = false, pitch = 0.62, over = 0.45, tile = TILES[0], wall, timber, thatch = false } = o;
        if (along) {
            // the same roof, turned a quarter
            G.push(0, 0, 0, PI / 2);
            const top = this.roof(hd, hw, y, { ...o, along: false });
            G.pop();
            return top;
        }
        const ex = hw + (hip ? over : 0.3),
            ez = hd + over,
            y0 = y - over * pitch,
            y1 = y + hd * pitch,
            rl = hip ? Math.max(0, hw - hd) : ex;
        const faces: Point[][] = [];
        for (const s of [-1, 1]) faces.push([[-ex, y0, s * ez], [ex, y0, s * ez], [rl, y1, 0], [-rl, y1, 0]]);
        if (hip) for (const s of [-1, 1]) faces.push([[s * ex, y0, -ez], [s * ex, y0, ez], [s * rl, y1, 0]]);
        for (const f of faces) {
            if (thatch) this.leaf(C.THATCH);
            else this.tile(tile);
            G.flat(f, 0, y - 4, 0);
            // the boards under the eaves
            this.wood(C.DARK);
            G.flat(f.map((p) => [p[0], p[1] - 0.09, p[2]]), 0, y + 99, 0);
        }
        // ridge and hip tiles
        if (thatch) this.wood(C.DARK);
        else this.tile(tile.map((c) => c * 0.86));
        if (rl > 0.05) G.strut([-rl - 0.05, y1 + 0.02, 0], [rl + 0.05, y1 + 0.02, 0], 0.15, 0.15, 5);
        if (hip) for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.strut([sx * ex, y0 + 0.03, sz * ez], [sx * rl, y1 + 0.03, 0], 0.13, 0.13, 5);
        else if (wall || timber) {
            if (wall) this.plaster(wall);
            else this.wood(timber);
            for (const s of [-1, 1]) G.flat([[s * hw, y - 0.02, -hd], [s * hw, y - 0.02, hd], [s * hw, y1 - 0.25 * pitch, 0]], 0, y, 0);
        }
        return y1;
    }
    /** A dormer window in the front (-Z) slope of a roof whose walls stop at y, over a block hd deep. */
    dormer(x: number, y: number, hd: number, pitch: number, wall: Rgb, tile: Rgb) {
        const G = this.G,
            zc = -hd * 0.5,
            yr = y + hd * 0.5 * pitch;
        this.plaster(wall).slab(x - 0.62, x + 0.62, y + 0.1, yr + 0.75, zc - 0.45, zc + 1.4);
        G.push(0, 0, zc - 0.45);
        this.window(x, yr + 0.18, 0.7, 0.8, null);
        G.pop();
        G.push(x, 0, zc + 0.55);
        this.roof(0.78, 1.15, yr + 0.75, { along: true, pitch: 0.6, over: 0.14, tile });
        G.pop();
        return this;
    }
    /** A chimney through the roof at (x, z), from y0 inside the roof up to y1. Returns the world point smoke leaves from. */
    chimney(x: number, z: number, y0: number, y1: number, c: Rgb): Point {
        this.plaster(c).slab(x - 0.42, x + 0.42, y0, y1, z - 0.34, z + 0.34, 0.03);
        this.stone(C.PALE).slab(x - 0.52, x + 0.52, y1, y1 + 0.14, z - 0.44, z + 0.44, 0.03);
        this.tile(TILES[1], 0.2).post(x, y1 + 0.14, z, 0.2, 0.42, 6, 0.15);
        return this.world(x, y1 + 0.7, z);
    }

    // ---- stairs and walls ----
    /** A flight of stone steps `w` wide climbing toward +Z from (z0, y0) to (z1, y1), between low side walls. */
    stairs(x: number, z0: number, y0: number, z1: number, y1: number, w: number, walls = true) {
        const n = Math.max(1, Math.round((y1 - y0) / 0.2)),
            dz = (z1 - z0) / n,
            dy = (y1 - y0) / n,
            a = w / 2;
        this.stone(C.PALE);
        for (let i = 0; i < n; i++) this.slab(x - a, x + a, y0 - 0.5, y0 + (i + 1) * dy, z0 + i * dz, z1 + 0.2);
        if (walls) {
            this.stone();
            for (const s of [-1, 1]) {
                const xa = x + s * a,
                    xb = x + s * (a + 0.5),
                    b0 = y0 - 0.5;
                // a wall whose cope climbs with the steps: two sides, the cope and the foot
                const G = this.G,
                    lo = y0 + 0.95,
                    hi = y1 + 0.95;
                for (const xs of [xa, xb]) G.flat([[xs, b0, z0 - 0.3], [xs, b0, z1 + 0.2], [xs, hi, z1 + 0.2], [xs, lo, z0 - 0.3]], (xa + xb) / 2, y0, (z0 + z1) / 2);
                G.flat([[xa, lo, z0 - 0.3], [xb, lo, z0 - 0.3], [xb, hi, z1 + 0.2], [xa, hi, z1 + 0.2]], x, y0 - 9, z0);
                G.flat([[xa, b0, z0 - 0.3], [xb, b0, z0 - 0.3], [xb, lo, z0 - 0.3], [xa, lo, z0 - 0.3]], x, y0, z1);
                this.stone(C.PALE).slab(xa - 0.08 * s, xb + 0.08 * s, lo - 0.02, lo + 0.3, z0 - 0.62, z0 - 0.02, 0.04);
                this.stone();
            }
        }
        return this;
    }
    /** A battlemented parapet along the top of a wall from a to b ([x, z]) at height y; `inward` is the side the defenders stand on. */
    battlement(a: number[], b: number[], y: number, t = 0.7, h = 1.5) {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
            yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0]),
            n = Math.max(1, Math.round(len / 2.6)),
            step = len / n;
        this.G.push(a[0], y, a[1], yaw);
        this.slab(0, len, 0, h * 0.45, -t / 2, t / 2);
        for (let i = 0; i < n; i++) this.slab(i * step + step * 0.2, i * step + step * 0.8, h * 0.45, h, -t / 2, t / 2, 0.04);
        this.G.pop();
        return this;
    }

    // ---- the furniture of a port ----
    crate(x: number, y: number, z: number, s = 0.5, yaw = 0) {
        this.G.push(x, y + s, z, yaw);
        this.wood(C.PLANK, 0.9).G.box(s, s, s, 0.04);
        this.wood(C.DARK);
        for (const k of [-1, 1]) this.G.push(0, k * s * 0.7, 0).box(s * 1.04, s * 0.09, s * 1.04, 0.01).pop();
        this.G.pop();
        return this;
    }
    barrel(x: number, y: number, z: number, s = 1, lying = 0) {
        const G = this.G;
        G.push(x, y + (lying ? 0.5 * s : 0), z, lying, lying ? PI / 2 : 0, 0, s);
        this.wood([0.46, 0.31, 0.18], 0.9);
        G.lathe([[0, 0, 0, -1], [0.38, 0, 0, -1], [0.5, 0.6, 1, 0], [0.38, 1.2, 0, 1], [0, 1.2, 0, 1]], 8);
        this.iron();
        for (const h of [0.24, 0.92]) G.push(0, h, 0).cyl(0.465, 0.07, 8, 0).pop();
        G.pop();
        return this;
    }
    /** A heap of full sacks. */
    sacks(x: number, y: number, z: number, n = 3) {
        this.paint(C.BURLAP, 0.95);
        for (let i = 0; i < n; i++) {
            const up = i > 2 ? 0.42 : 0;
            this.G.push(x + (i % 3) * 0.75 - 0.75 + (up ? 0.38 : 0), y + 0.2 + up, z + this.rr(-0.15, 0.15), this.rr(0, TAU), 0, 0, 0.5, 0.26, 0.34)
                .sphere(1, 7, 5)
                .pop();
        }
        return this;
    }
    /** A stack of cargo: `n` pieces set down on a patch `r` across. */
    cargo(x: number, y: number, z: number, n: number, r: number) {
        for (let i = 0; i < n; i++) {
            const a = this.rr(0, TAU),
                d = Math.sqrt(this.R()) * r,
                px = x + Math.cos(a) * d,
                pz = z + Math.sin(a) * d,
                k = this.R();
            if (k < 0.45) {
                const s = this.rr(0.38, 0.6);
                this.crate(px, y, pz, s, this.rr(0, 1.5));
                if (this.R() < 0.35) this.crate(px + this.rr(-0.1, 0.1), y + s * 2, pz, s * 0.8, this.rr(0, 1.5));
            } else if (k < 0.85) this.barrel(px, y, pz, this.rr(0.85, 1.05), this.R() < 0.2 ? this.rr(0.1, 3) : 0);
            else this.sacks(px, y, pz, 3 + ((this.R() * 3) | 0));
        }
        return this;
    }
    bollard(x: number, y: number, z: number) {
        this.iron().post(x, y, z, 0.2, 0.62, 7, 0.17).post(x, y + 0.6, z, 0.27, 0.14, 7, 0.2);
        return this;
    }
    /** A gun on its carriage, laid along -Z. */
    cannon(x: number, y: number, z: number, yaw: number, s = 1) {
        const G = this.G;
        G.push(x, y, z, yaw, 0, 0, s);
        this.wood(C.DARK).slab(-0.42, 0.42, 0.22, 0.5, -0.5, 0.95, 0.03).slab(-0.42, 0.42, 0.5, 0.72, 0.2, 0.95, 0.03);
        for (const sx of [-1, 1]) for (const z2 of [-0.25, 0.7]) this.beam([sx * 0.44, 0.24, z2], [sx * 0.58, 0.24, z2], 0.24, 0.24, 8);
        this.iron().beam([0, 0.78, 1.0], [0, 0.86, -1.5], 0.23, 0.15, 8).beam([0, 0.86, -1.5], [0, 0.865, -1.62], 0.19, 0.19, 8);
        G.push(0, 0.78, 1.08).sphere(0.13, 6, 4).pop();
        G.pop();
        return this;
    }
    /** A pyramid of round shot beside a gun. */
    shot(x: number, y: number, z: number) {
        this.iron();
        for (const [a, b, c] of [[0, 0, 0], [0.3, 0, 0], [0.15, 0, 0.26], [0.15, 0.24, 0.09]]) this.G.push(x + a, y + 0.14 + b, z + c).sphere(0.15, 6, 4).pop();
        return this;
    }
    /** A hand cart, its shafts toward -Z. */
    cart(x: number, y: number, z: number, yaw: number) {
        const G = this.G;
        G.push(x, y, z, yaw);
        this.wood(C.PLANK).slab(-0.7, 0.7, 0.62, 0.72, -1.1, 1.1).slab(-0.7, -0.62, 0.72, 1.1, -1.1, 1.1).slab(0.62, 0.7, 0.72, 1.1, -1.1, 1.1).slab(-0.7, 0.7, 0.72, 1.1, 1.02, 1.1);
        this.wood(C.DARK);
        for (const s of [-1, 1]) {
            this.beam([s * 0.78, 0.6, 0.1], [s * 0.9, 0.6, 0.1], 0.6, 0.6, 12);
            this.beam([s * 0.6, 0.66, -1.1], [s * 0.6, 0.5, -2.3], 0.04);
        }
        G.pop();
        return this;
    }
    /** A market stall: a trestle of goods under a striped awning. */
    stall(x: number, y: number, z: number, yaw: number, c: Rgb) {
        const G = this.G;
        G.push(x, y, z, yaw);
        this.wood(C.PLANK).slab(-1.5, 1.5, 0.85, 0.93, -0.75, 0.75);
        this.wood(C.DARK);
        for (const sx of [-1.4, 1.4]) {
            for (const sz of [-0.65, 0.65]) this.post(sx, 0, sz, 0.05, 0.86, 4);
            this.post(sx, 0, 0.95, 0.05, 2.7, 4);
        }
        // the awning runs from the tall back poles down over the front of the trestle
        G.push(0, 0, 0.95);
        this.awning(0, 2.7, 3.3, 2.1, c, C.CANVAS, 0.55);
        G.pop();
        // the wares: fruit in baskets, bolts of cloth, jars
        const kind = this.R();
        for (let i = 0; i < 5; i++) {
            const px = -1.2 + i * 0.6,
                pz = this.rr(-0.35, 0.35);
            if (kind < 0.4) {
                this.paint(C.BURLAP).post(px, 0.93, pz, 0.24, 0.16, 7, 0.28);
                this.matte(this.pick([[0.8, 0.5, 0.1], [0.7, 0.16, 0.1], [0.5, 0.62, 0.16], [0.86, 0.74, 0.2]]));
                for (let k = 0; k < 4; k++) G.push(px + this.rr(-0.12, 0.12), 1.12, pz + this.rr(-0.12, 0.12)).sphere(0.1, 5, 4).pop();
            } else if (kind < 0.7) this.paint(this.pick(SHUTTERS.concat(PLASTERS)), 0.9).slab(px - 0.2, px + 0.2, 0.93, 0.93 + this.rr(0.1, 0.3), pz - 0.3, pz + 0.3, 0.04);
            else this.tile(TILES[2], 0.2).G.push(px, 0.93, pz).lathe([[0, 0, 0, -1], [0.12, 0, 1, -0.3], [0.2, 0.22, 1, 0], [0.09, 0.4, 1, 0.4], [0.12, 0.46, 1, 0], [0, 0.46, 0, 1]], 7).pop();
        }
        G.pop();
        return this;
    }
    bench(x: number, y: number, z: number, yaw: number, table = false) {
        const G = this.G;
        G.push(x, y, z, yaw);
        this.wood(C.PLANK);
        if (table) {
            this.slab(-0.9, 0.9, 0.72, 0.8, -0.45, 0.45);
            for (const sx of [-0.75, 0.75]) this.slab(sx - 0.05, sx + 0.05, 0, 0.72, -0.35, 0.35);
        } else {
            this.slab(-0.9, 0.9, 0.42, 0.48, -0.18, 0.18);
            for (const sx of [-0.75, 0.75]) this.slab(sx - 0.04, sx + 0.04, 0, 0.42, -0.15, 0.15);
        }
        G.pop();
        return this;
    }
    /** A rounded bush. */
    bush(x: number, y: number, z: number, s: number) {
        this.leaf([this.rr(0.14, 0.24), this.rr(0.3, 0.42), 0.12]);
        this.G.push(x, y + s * 0.45, z, this.rr(0, TAU), 0, 0, s * this.rr(0.9, 1.3), s * this.rr(0.6, 0.9), s * this.rr(0.9, 1.3))
            .sphere(1, 7, 5)
            .pop();
        return this;
    }
    /** A coconut palm rooted at (x, y, z); `s` scales it. Its fronds move in the wind. */
    palm(x: number, y: number, z: number, s: number) {
        const G = this.G,
            lean = this.rr(0, TAU),
            bend = this.rr(0.5, 2.4) * s,
            h = this.rr(5.5, 8.5) * s;
        const spine: Point[] = [];
        for (let k = 0; k <= 3; k++) spine.push([x + Math.cos(lean) * bend * (k / 3) ** 2, y + (h * k) / 3, z + Math.sin(lean) * bend * (k / 3) ** 2]);
        this.wood([0.42, 0.34, 0.24], 0.9);
        for (let k = 0; k < 3; k++) G.strut(spine[k], spine[k + 1], 0.27 * s * (1 - k * 0.2), 0.27 * s * (1 - (k + 1) * 0.2), 5);
        const [tx, ty, tz] = spine[3];
        this.leaf([this.rr(0.18, 0.26), this.rr(0.36, 0.46), 0.12]);
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * TAU + this.rr(0, 0.6),
                c = Math.cos(a),
                sn = Math.sin(a),
                reach = this.rr(2.6, 3.7) * s,
                w = 0.6 * s;
            const mid: Point = [tx + c * reach * 0.5, ty + 0.6 * s, tz + sn * reach * 0.5],
                tip: Point = [tx + c * reach, ty - this.rr(0.4, 1.5) * s, tz + sn * reach],
                l: Point = [mid[0] - sn * w, mid[1] - 0.15 * s, mid[2] + c * w],
                r: Point = [mid[0] + sn * w, mid[1] - 0.15 * s, mid[2] - c * w];
            this.blade([tx, ty, tz], l, mid, 0.1, 0.5, 0.45);
            this.blade([tx, ty, tz], mid, r, 0.1, 0.45, 0.5);
            this.blade(l, tip, mid, 0.5, 1, 0.45);
            this.blade(mid, tip, r, 0.45, 1, 0.5);
        }
        return this;
    }
    // one facet of a frond, drawn on both faces and turned to shade as if lit from above
    private blade(a: Point, b: Point, c: Point, wa: number, wb: number, wc: number) {
        const G = this.G;
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy,
            ny = uz * vx - ux * vz,
            nz = ux * vy - uy * vx;
        const l = (ny < 0 ? -1 : 1) / (Math.hypot(nx, ny, nz) || 1);
        nx *= l;
        ny *= l;
        nz *= l;
        for (const s of [1, -1]) G.tri(G.vert(a[0], a[1], a[2], nx * s, ny * s, nz * s, wa), G.vert(b[0], b[1], b[2], nx * s, ny * s, nz * s, wb), G.vert(c[0], c[1], c[2], nx * s, ny * s, nz * s, wc));
    }
}

/**
 * An open boat's hull into `g`: bow at -Z, waterline at y = 0. Planked outside and in, with
 * thwarts across it. Used both for boats hauled out on the beach and for the ones afloat.
 */
export function boatHull(g: Geo, len: number, beam: number, depth: number, paint: Rgb) {
    const NS = 8,
        star: Point[][] = [];
    for (let i = 0; i <= NS; i++) {
        const t = i / NS,
            // a transom stern, fullest a little aft of amidships, drawn in to the stem
            w = Math.max(0.03, (beam / 2) * Math.min(1, 0.62 + 1.5 * t) * (1 - Math.pow(Math.max(0, (t - 0.42) / 0.58), 2.3))),
            sheer = depth * (0.62 + 0.3 * (2 * t - 1) ** 2),
            z = len / 2 - t * len - len * 0.05 * Math.max(0, t - 0.75) * 4,
            k = -depth * 0.42 * (1 - 0.7 * t ** 4);
        star.push([[0, k, z], [w * 0.62, k * 0.7, z], [w * 0.95, 0.05, z], [w, sheer, z]]);
    }
    const N = gridNormals(star, () => [1, -0.4, 0]),
        mirror = (p: Point): Point => [-p[0], p[1], p[2]],
        flip = (p: Point): Point => [-p[0], -p[1], -p[2]];
    for (const [P, Nn] of [[star, N], [star.map((r) => r.map(mirror)), N.map((r) => r.map(mirror))]]) {
        g.mat(0.8, 0, 0, MATERIAL.WOOD).col(0.2, 0.16, 0.13).skin(P, Nn, 0, 2);
        g.mat(0.7, 0, 0, MATERIAL.PAINT).col(paint[0], paint[1], paint[2]).skin(P, Nn, 2, 3);
        // the inside of the planking
        g.mat(0.9, 0, 0, MATERIAL.WOOD).col(0.5, 0.39, 0.26).skin(P, Nn.map((r) => r.map(flip)), 0, 3);
    }
    g.mat(0.85, 0, 0, MATERIAL.WOOD).col(0.36, 0.26, 0.17);
    const s0 = star[0];
    for (let j = 0; j < 3; j++) {
        g.flat([s0[j], s0[j + 1], mirror(s0[j + 1]), mirror(s0[j])], 0, 0, 0);
        g.flat([s0[j], s0[j + 1], mirror(s0[j + 1]), mirror(s0[j])], 0, 0, len);
    }
    for (const t of [0.24, 0.5, 0.74]) {
        const r = star[Math.round(t * NS)];
        g.push(0, r[3][1] - depth * 0.3, r[3][2]).box(r[3][0] * 0.94, 0.03, len * 0.035, 0).pop();
    }
}
