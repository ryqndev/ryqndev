import { Geo, gridNormals, MATERIAL, type Mesh, type Point, registerMesh } from '@ryqndev/brinewake-renderer';
import { clamp, PI, smooth } from '@ryqndev/rimefire-math';

/** One square sail: where its yard sits in hull space, and its size fully set. */
export interface SailSlot {
    y: number;
    z: number;
    w: number;
    h: number;
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
    /** guns per side, and each one's muzzle on the starboard side (mirror x for port) */
    guns: number;
    muzzles: Point[];
    /** masthead the flag flies from, and the height markers float at */
    flag: Point;
    lantern: Point;
}

export type ModelName = 'sail' | 'flag' | 'ball' | 'crate' | 'barrel' | 'plank';

/** The three hulls, smallest first: sloop, brig, galleon. Filled in by buildModels(). */
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
    /** a raised stern with a great cabin */
    cabin: boolean;
    masts: MastSpec[];
}

const SPECS: HullSpec[] = [
    { len: 17, beam: 5.4, draft: 1.9, free: 1.9, guns: 3, cabin: false, masts: [{ z: -0.8, h: 16, sails: [[9.2, 9.2, 7.2], [14.8, 6.6, 5.2]] }] },
    {
        len: 25, beam: 7, draft: 2.5, free: 2.4, guns: 5, cabin: true,
        masts: [{ z: -5.2, h: 18, sails: [[10, 10.5, 7.8], [16.4, 7.6, 6]] }, { z: 4.4, h: 20.5, sails: [[11, 11.5, 8.6], [18.4, 8.4, 7]] }],
    },
    {
        len: 34, beam: 9, draft: 3.2, free: 3, guns: 8, cabin: true,
        masts: [
            { z: -9.5, h: 21, sails: [[11.5, 12, 9], [18.6, 9, 6.8]] },
            { z: 1, h: 26, sails: [[12.5, 14, 10], [20.6, 10.5, 7.6], [25.4, 7.4, 4.6]] },
            { z: 10.5, h: 17, sails: [[10.5, 9, 7.4]] },
        ],
    },
];

const TAR = [0.17, 0.14, 0.12],
    PLANK = [0.5, 0.34, 0.2],
    DECK = [0.64, 0.52, 0.36],
    SPAR = [0.4, 0.28, 0.17],
    RIG = [0.1, 0.09, 0.08],
    IRON = [0.11, 0.11, 0.12];

function buildHull(spec: HullSpec): HullModel {
    const { len: L, beam: B, draft: D, free: F } = spec;
    const g = new Geo();
    const wood = (c: number[], rough = 0.8) => g.mat(rough, 0, 0, MATERIAL.WOOD).col(c[0], c[1], c[2]);
    // t runs 0 at the stern to 1 at the bow
    const zAt = (t: number) => L / 2 - t * L;
    const tAt = (z: number) => (L / 2 - z) / L;
    const wAt = (t: number) => Math.max(0.05, (B / 2) * Math.min(1, 0.72 + 1.3 * t) * (1 - Math.pow(Math.max(0, (t - 0.4) / 0.6), 2.4)));
    // gunwale: sweeping up to the stern (more so with a cabin) and a little at the bow
    const gAt = (t: number) => F + B * 0.2 * smooth(0.36, 0, t) * (spec.cabin ? 1 : 0.45) + F * 0.4 * t * t * t;
    const kAt = (t: number) => -D * (1 - 0.6 * t ** 3 - 0.2 * (1 - t) ** 4);
    const dAt = (t: number) => gAt(t) - 0.8;
    const inAt = (t: number) => Math.max(0.02, wAt(t) * 0.97 - 0.16);
    // the stem rakes forward as it rises
    const pt = (t: number, x: number, y: number): Point => [x, y, zAt(t) - L * 0.07 * smooth(0.72, 1, t) * clamp((y - kAt(t)) / (gAt(t) - kAt(t)), 0, 1)];

    // ---- shell: keel, bilge, waterline, wale, gunwale at each station; starboard, then mirrored ----
    const NS = 14;
    const star: Point[][] = [];
    for (let i = 0; i <= NS; i++) {
        const t = i / NS,
            w = wAt(t),
            k = kAt(t),
            gy = gAt(t);
        star.push([pt(t, 0, k), pt(t, w * 0.55, k * 0.82), pt(t, w * 0.9, k * 0.3), pt(t, w, 0.3), pt(t, w * 1.03, gy * 0.55), pt(t, w * 0.97, gy)]);
    }
    const starN = gridNormals(star, () => [1, -0.35, 0]);
    const mirror = (p: Point): Point => [-p[0], p[1], p[2]];
    for (const [P, N] of [[star, starN], [star.map((r) => r.map(mirror)), starN.map((r) => r.map(mirror))]]) {
        wood(TAR, 0.7).skin(P, N, 0, 3);
        // the wale is painted: it takes the ship's colours
        g.mat(0.6, 0, 0, MATERIAL.PAINT).col(1, 1, 1).skin(P, N, 3, 4);
        wood(PLANK).skin(P, N, 4, 5);
    }
    // transom, closing the stern
    wood(PLANK);
    for (let j = 0; j < 5; j++) g.flat([star[0][j], star[0][j + 1], mirror(star[0][j + 1]), mirror(star[0][j])], 0, 0, 0);

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

    // ---- great cabin and stern lantern ----
    const lamp = (r: number, gr: number, b: number, e: number) => g.mat(0.3, 0, e, MATERIAL.EMISSIVE).col(r, gr, b);
    if (spec.cabin) {
        const t = 0.1,
            hw = inAt(t) * 0.9,
            y = dAt(t) + 0.8,
            z = zAt(t);
        wood([0.46, 0.3, 0.18]).push(0, y, z).box(hw, 0.95, L * 0.085, 0.07).pop();
        lamp(1, 0.74, 0.4, 0.45);
        for (const s of [-1, 1]) {
            g.push(s * (hw + 0.02), y + 0.2, z).box(0.04, 0.3, L * 0.05, 0.02).pop();
            g.push(s * wAt(0) * 0.42, gAt(0) * 0.6, L / 2 + 0.03).box(0.5, 0.36, 0.05, 0.02).pop();
        }
        g.push(0, y + 0.2, z - L * 0.085 - 0.02).box(hw * 0.5, 0.3, 0.04, 0.02).pop();
    }
    const lantern: Point = [0, gAt(0) + 1.5, L / 2 + 0.3];
    g.mat(0.5, 0.8, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]).strut([0, gAt(0) - 0.1, L / 2 - 0.05], [0, lantern[1] - 0.2, lantern[2]], 0.06, 0.05, 5);
    lamp(1, 0.72, 0.36, 0.6).push(lantern[0], lantern[1], lantern[2]).box(0.17, 0.22, 0.17, 0.04).pop();

    // ---- masts, yards, tops and standing rigging ----
    const sails: SailSlot[] = [];
    let top: Point = [0, 0, 0];
    for (const m of spec.masts) {
        const t = tAt(m.z),
            d = dAt(t),
            r = 0.16 + m.h * 0.007,
            head: Point = [0, d + m.h, m.z];
        wood(SPAR, 0.7).push(0, d - 0.3, m.z).cyl(r, m.h + 0.3, 8, 0.02, r * 0.55).pop();
        g.push(0, d + m.h * 0.7, m.z).cyl(0.62, 0.42, 8, 0.04).pop();
        for (const [y, w, h] of m.sails) {
            g.strut([-w / 2 - 0.45, d + y, m.z - 0.32], [w / 2 + 0.45, d + y, m.z - 0.32], 0.11, 0.11, 6);
            sails.push({ y: d + y - 0.1, z: m.z - 0.34, w, h });
        }
        g.mat(0.9, 0, 0, MATERIAL.PAINT).col(RIG[0], RIG[1], RIG[2]);
        for (const s of [-1, 1]) for (const o of [-1.3, 1.5]) g.strut([s * wAt(tAt(m.z + o)) * 0.97, gAt(t), m.z + o], [0, d + m.h * 0.7, m.z], 0.035, 0.035, 4);
        if (head[1] > top[1]) top = head;
    }
    const sprit: Point = [0, gAt(1) + L * 0.085, -L / 2 - L * 0.21],
        fore = spec.masts[0];
    wood(SPAR, 0.7).strut(pt(0.93, 0, gAt(0.93) - 0.1), sprit, 0.17, 0.08, 6);
    g.mat(0.9, 0, 0, MATERIAL.PAINT).col(RIG[0], RIG[1], RIG[2]);
    g.strut([0, dAt(tAt(fore.z)) + fore.h, fore.z], sprit, 0.03, 0.03, 4);
    g.strut([0, dAt(tAt(fore.z)) + fore.h * 0.7, fore.z], [sprit[0], sprit[1] * 0.8, sprit[2] * 0.86], 0.03, 0.03, 4);
    for (let i = 1; i < spec.masts.length; i++) {
        const a = spec.masts[i - 1],
            b = spec.masts[i];
        g.strut([0, dAt(tAt(a.z)) + a.h, a.z], [0, dAt(tAt(b.z)) + b.h, b.z], 0.03, 0.03, 4);
    }

    // ---- guns: barrels run out through the bulwarks, both sides ----
    const muzzles: Point[] = [];
    for (let i = 0; i < spec.guns; i++) {
        const t = 0.24 + ((i + 0.5) / spec.guns) * 0.46,
            x = wAt(t) * 0.97,
            y = dAt(t) + 0.42,
            z = zAt(t);
        muzzles.push([x + 0.65, y, z]);
        for (const s of [-1, 1]) {
            g.mat(0.42, 0.9, 0, MATERIAL.METAL).col(IRON[0], IRON[1], IRON[2]).strut([s * (x - 1.05), y, z], [s * (x + 0.55), y, z], 0.2, 0.15, 6);
            wood(SPAR).push(s * (x - 0.9), y - 0.24, z).box(0.42, 0.15, 0.3, 0.03).pop();
        }
    }

    return { mesh: registerMesh(g), len: L, beam: B, draft: D, deck: dAt(0.5), sails, guns: spec.guns, muzzles, flag: top, lantern };
}

export function buildModels() {
    for (const spec of SPECS) HULLS.push(buildHull(spec));

    // ---- unit sail: hangs from y = 0 down to -1, one unit wide, bellying forward ----
    let g = new Geo();
    const N = 6;
    const cloth: Point[][] = [];
    for (let i = 0; i <= N; i++) {
        const v = i / N,
            row: Point[] = [];
        for (let j = 0; j <= N; j++) {
            const u = j / N;
            row.push([u - 0.5, -v, -0.17 * Math.sin(PI * u) * Math.sin(PI * Math.pow(v, 0.75) * 0.85)]);
        }
        cloth.push(row);
    }
    g.mat(0.95, 0, 0, MATERIAL.CLOTH).col(0.93, 0.9, 0.8);
    // the foot is free to shiver; the head is bent to the yard
    const flutter = (i: number) => (i / N) * 0.3;
    const front = gridNormals(cloth, () => [0, 0, -1]);
    g.skin(cloth, front, 0, N, flutter);
    g.skin(cloth, front.map((r) => r.map((n) => [-n[0], -n[1], -n[2]])), 0, N, flutter);
    M.sail = registerMesh(g);

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
    g.mat(0.9, 0, 0, MATERIAL.WOOD).col(PLANK[0], PLANK[1], PLANK[2]).box(0.16, 0.05, 1, 0.02);
    M.plank = registerMesh(g);
}
