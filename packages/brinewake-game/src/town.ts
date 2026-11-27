import { addInstance, cam, env, Geo, MATERIAL, type Mesh, R, registerMesh, seaHeight, shoreCalm } from '@ryqndev/brinewake-renderer';
import { angDiff, damp, m4, m4mul, m4trs, PI, rnd, rnds, TAU } from '@ryqndev/kiln-math';

import { cadence, drawFigure, gaitPose, mixPose, newPose, type Parts, RIG, solvePose, standPose } from './figure';
import { light, spawn, sprite } from './fx';
import { HULLS, M as MODELS, sailMesh } from './models';
import { S } from './state';
import { height, W } from './world';
import { boatHull } from './world/mason';

// The life of the home port: people about their business, gulls over the harbour, boats lying to
// their moorings, smoke from the chimneys, the mill turning and the lighthouse flashing. None of it
// touches the simulation; it is drawn only while the camera is near enough to see it.

const MAN = 0,
    WOMAN = 1,
    GUARD = 2;
/** How far from the middle of the town its people, and its boats and smoke, are still worth drawing. */
const PEOPLE_RANGE = 560,
    TOWN_RANGE = 1300;
// the breeze the smoke leans on, m/s: the same one the gunsmoke drifts on
const WIND_X = 2.6,
    WIND_Z = 1.4;

const CLOTHES = [
    [0.86, 0.82, 0.72],
    [0.3, 0.42, 0.62],
    [0.7, 0.52, 0.24],
    [0.56, 0.24, 0.18],
    [0.32, 0.46, 0.3],
    [0.5, 0.48, 0.46],
    [0.74, 0.66, 0.5],
    [0.42, 0.3, 0.5],
];
const REDCOAT = [0.72, 0.12, 0.1];
const BOAT_PAINT = [
    [0.9, 0.88, 0.8],
    [0.22, 0.42, 0.52],
    [0.66, 0.2, 0.14],
    [0.24, 0.42, 0.26],
    [0.84, 0.66, 0.24],
];

interface Path {
    pts: number[][];
    /** distance along the circuit at the start of each leg, and its whole length */
    at: number[];
    len: number;
}
interface Person {
    kind: number;
    tint: number[];
    /** the circuit they walk, or null for someone standing about */
    path: Path | null;
    /** metres along it, which way round, how fast, and how far to one side of its line */
    d: number;
    dir: number;
    speed: number;
    side: number;
    x: number;
    y: number;
    z: number;
    yaw: number;
    /** where an idler faces when left alone */
    home: number;
    /** 0 standing .. 1 striding, and seconds left of a pause */
    stride: number;
    rest: number;
    phase: number;
    seed: number;
}
interface Gull {
    /** middle and radius of the circle it wheels in, and the height it keeps */
    cx: number;
    cz: number;
    r: number;
    y: number;
    a: number;
    /** signed speed along the circle, m/s */
    v: number;
    seed: number;
}

const T = {} as { parts: Parts[]; gull: Mesh; wing: Mesh; rowboat: Mesh; smack: Mesh; rotor: Mesh };
const people: Person[] = [],
    gulls: Gull[] = [];
const Bm = m4(),
    Lm = m4(),
    Tm = m4();
let millA = 0;

/** The meshes a working man of the port is drawn with: the hands a captain hires out of its tavern are the same sort (hands.ts). */
export const townsman = () => T.parts[MAN];

/** Builds the meshes the town's life is drawn with, and casts its people. Call once, after buildWorld() and buildModels(). */
export function buildTownLife() {
    const plain = (g: Geo, c: number[], rough = 0.85) => g.mat(rough, 0, 0, MATERIAL.METAL).col(c[0], c[1], c[2]);
    const tinted = (g: Geo) => g.mat(0.85, 0, 0, MATERIAL.PAINT).col(1, 1, 1);
    const SKIN = [0.8, 0.6, 0.46],
        BREECHES = [0.26, 0.22, 0.19],
        HAT = [0.2, 0.15, 0.11];

    // ---- people: for each kind a pelvis, a chest and a head, and the limbs they share, all built to
    // the skeleton in figure.ts: each part round its own joint, the figure facing -Z ----
    const EYE = [0.05, 0.04, 0.04],
        HAIR = [0.17, 0.12, 0.08],
        SHOE = [0.12, 0.1, 0.09],
        HOSE = [0.82, 0.79, 0.7],
        BELT = [0.16, 0.12, 0.09];
    // a head on its neck, with a face to it: eyes, a nose, and hair behind; whatever is worn on it is added by `hat`
    const head = (hair: number[] | null, hat: (g: Geo) => void) => {
        const g = new Geo();
        plain(g, SKIN).push(0, -0.03, 0).cyl(0.052, 0.1, 7, 0.01).pop();
        g.push(0, 0.12, 0, 0, 0, 0, 0.95, 1.06, 1).sphere(0.118, 10, 7).pop();
        g.push(0, 0.1, -0.118).box(0.016, 0.022, 0.018, 0.008).pop();
        plain(g, EYE);
        for (const s of [-1, 1]) g.push(s * 0.043, 0.14, -0.103).sphere(0.017, 5, 4).pop();
        if (hair) plain(g, hair).push(0, 0.14, 0.03, 0, 0, 0, 1, 0.98, 0.95).sphere(0.122, 9, 6).pop();
        hat(g);
        return registerMesh(g);
    };
    // a chest standing up from the waist: broad at the shoulders, which are rounded over the tops of the arms
    const chest = (g: Geo, hw: number, hd: number) => {
        g.push(0, 0.31, 0).box(hw, 0.16, hd, 0.05).pop().push(0, 0.08, 0).box(hw * 0.88, 0.12, hd * 0.92, 0.04).pop();
        for (const s of [-1, 1]) g.push(s * (hw + 0.01), 0.42, 0).sphere(0.064, 7, 5).pop();
        return g;
    };

    // legs: breeches to the knee, a stockinged shin, and a buckled shoe
    let g = new Geo();
    plain(g, BREECHES).push(0, -RIG.thigh / 2, 0).box(0.08, RIG.thigh / 2 + 0.02, 0.09, 0.035).pop();
    const thigh = registerMesh(g);
    g = new Geo();
    plain(g, BREECHES).push(0, -0.03, 0).sphere(0.078, 7, 5).pop();
    plain(g, HOSE).push(0, -RIG.shin / 2 - 0.02, 0).box(0.058, RIG.shin / 2, 0.064, 0.03).pop();
    const shin = registerMesh(g);
    g = new Geo();
    plain(g, SHOE).push(0, -RIG.ankle + 0.045, -0.045).box(0.064, 0.045, 0.125, 0.025).pop().push(0, -0.005, 0).sphere(0.058, 6, 4).pop();
    const foot = registerMesh(g);
    // arms: a sleeve to the elbow; then the forearm, and a hand
    g = new Geo();
    tinted(g).push(0, -RIG.upper / 2, 0).box(0.056, RIG.upper / 2 + 0.02, 0.06, 0.028).pop();
    const upper = registerMesh(g);
    g = new Geo();
    tinted(g).push(0, -0.02, 0).sphere(0.056, 6, 4).pop().push(0, -0.12, 0).box(0.05, 0.12, 0.054, 0.024).pop();
    plain(g, SKIN).push(0, -RIG.fore + 0.03, 0).sphere(0.056, 7, 5).pop();
    const fore = registerMesh(g);
    const limbs = { thigh, shin, foot, upper, fore };

    T.parts = [];
    // a man: breeches and a belt; a shirt; a low-crowned hat
    g = new Geo();
    plain(g, BREECHES).push(0, -0.01, 0).box(0.178, 0.085, 0.108, 0.03).pop();
    plain(g, BELT).push(0, 0.085, 0).box(0.18, 0.028, 0.11, 0.01).pop();
    const manHips = registerMesh(g);
    T.parts[MAN] = {
        ...limbs,
        pelvis: manHips,
        chest: registerMesh(chest(tinted(new Geo()), 0.2, 0.115)),
        head: head(HAIR, (h) => plain(h, HAT).push(0, 0.195, 0).cyl(0.235, 0.025, 10, 0).pop().push(0, 0.205, 0).cyl(0.125, 0.11, 9, 0.02, 0.105).pop()),
    };
    // a woman: a skirt to the ground; a pale bodice; a kerchief over her hair
    g = new Geo();
    tinted(g).push(0, -RIG.hipY + 0.04, 0).lathe([[0.35, 0, 1, 0.2], [0.27, 0.5, 1, 0.22], [0.15, 0.97, 1, 0.3], [0, 0.97, 0, 1]], 11).pop();
    const skirt = registerMesh(g);
    T.parts[WOMAN] = {
        ...limbs,
        pelvis: skirt,
        chest: registerMesh(chest(plain(new Geo(), [0.88, 0.85, 0.78]), 0.172, 0.105)),
        head: head(null, (h) => plain(h, [0.9, 0.88, 0.82]).push(0, 0.15, 0.025, 0, 0, 0, 1, 0.85, 1).sphere(0.128, 9, 6).pop()),
    };
    // a soldier: his coat to the hip; white cross-belts and a musket sloped on the right shoulder; a cocked hat
    g = new Geo();
    tinted(g).push(0, -0.02, 0).box(0.195, 0.1, 0.118, 0.03).pop();
    const coatTail = registerMesh(g);
    g = chest(tinted(new Geo()), 0.205, 0.118);
    plain(g, [0.9, 0.88, 0.8]).push(0, 0.2, -0.122, 0, 0, 0.6).box(0.03, 0.3, 0.008, 0).pop().push(0, 0.2, -0.122, 0, 0, -0.6).box(0.03, 0.3, 0.008, 0).pop();
    plain(g, [0.3, 0.2, 0.13]).strut([0.24, -0.02, -0.12], [0.2, 1.03, 0.2], 0.03, 0.022, 5);
    g.mat(0.4, 0.9, 0, MATERIAL.METAL).col(0.3, 0.3, 0.32).strut([0.2, 1.03, 0.2], [0.19, 1.3, 0.28], 0.012, 0.004, 4);
    T.parts[GUARD] = {
        ...limbs,
        pelvis: coatTail,
        chest: registerMesh(g),
        head: head(HAIR, (h) => plain(h, [0.06, 0.06, 0.07]).push(0, 0.19, 0).cyl(0.25, 0.05, 3, 0, 0.21).pop().push(0, 0.21, 0).cyl(0.125, 0.09, 8, 0.02, 0.105).pop()),
    };

    // ---- gulls: a body, and one wing drawn twice ----
    g = new Geo();
    plain(g, [0.93, 0.93, 0.9], 0.7).push(0, 0, 0, 0, 0, 0, 0.11, 0.1, 0.3).sphere(1, 7, 5).pop();
    g.push(0, 0.05, -0.3).sphere(0.075, 6, 4).pop();
    plain(g, [0.85, 0.6, 0.15]).strut([0, 0.04, -0.36], [0, 0.02, -0.5], 0.025, 0.004, 4);
    plain(g, [0.75, 0.75, 0.74]).push(0, 0.01, 0.34).box(0.07, 0.008, 0.1, 0).pop();
    T.gull = registerMesh(g);
    g = new Geo();
    // root at the origin, reaching out along +X: white to the wrist, grey beyond, black at the tip
    for (const [x0, x1, c, w0, w1] of [[0, 0.42, 0.9, 0.15, 0.13], [0.42, 0.8, 0.66, 0.13, 0.07], [0.8, 0.95, 0.12, 0.07, 0.01]]) {
        plain(g, [c, c, c * 0.98], 0.7);
        const sweep = (x: number) => x * x * 0.35;
        for (const up of [1, -1]) {
            const id = [[x0, -w0], [x1, -w1], [x1, w1 * 0.6], [x0, w0 * 0.6]].map(([x, z]) => g.vert(x, 0, z + sweep(x), 0, up, 0));
            g.quad(id[0], id[1], id[2], id[3]);
        }
    }
    T.wing = registerMesh(g);

    // ---- boats: a rowing boat with her oars shipped, and a fishing smack under bare poles ----
    g = new Geo();
    boatHull(g, 4.8, 1.6, 0.62, [1, 1, 1]);
    g.mat(0.85, 0, 0, MATERIAL.WOOD).col(0.5, 0.4, 0.27);
    for (const s of [-1, 1]) g.strut([s * 0.35, 0.3, 1.6], [s * 0.5, 0.42, -1.7], 0.03, 0.03, 4).push(s * 0.5, 0.42, -1.9).box(0.07, 0.012, 0.28, 0).pop();
    T.rowboat = registerMesh(g);

    g = new Geo();
    boatHull(g, 8.6, 2.9, 1.05, [1, 1, 1]);
    g.mat(0.85, 0, 0, MATERIAL.WOOD).col(0.52, 0.41, 0.28).push(0, 0.42, 0.2).box(1.25, 0.03, 3.3, 0).pop();
    g.col(0.4, 0.29, 0.18).push(0, 0.75, 2.2).box(0.8, 0.34, 0.9, 0.04).pop();
    g.push(0, 0.3, -1).cyl(0.1, 8.2, 6, 0.01, 0.055).pop();
    g.strut([0, 1.7, -0.9], [0, 2.0, 3.6], 0.06, 0.045, 5).strut([0, 6.3, -0.9], [0, 6.9, 1.9], 0.05, 0.035, 5);
    // the mainsail stowed along the boom, the stays, a net heaped forward
    g.mat(0.95, 0, 0, MATERIAL.CLOTH).col(0.78, 0.7, 0.54).strut([0, 1.95, -0.6], [0, 2.2, 3.3], 0.17, 0.12, 6);
    g.mat(0.9, 0, 0, MATERIAL.PAINT).col(0.1, 0.09, 0.08);
    for (const [a, b] of [[[0, 8.4, -1], [0, 0.9, -4.6]], [[0, 8.4, -1], [1.35, 0.7, 0.4]], [[0, 8.4, -1], [-1.35, 0.7, 0.4]], [[0, 6.3, -0.9], [0, 2.0, 3.6]]]) g.strut(a, b, 0.018, 0.018, 3);
    g.mat(0.95, 0, 0, MATERIAL.METAL).col(0.28, 0.32, 0.24).push(0, 0.6, -2.3, 0, 0, 0, 0.7, 0.22, 0.8).sphere(1, 7, 5).pop();
    T.smack = registerMesh(g);

    // ---- the mill's sails: four lattices on their stocks, canvas spread, turning about -Z ----
    g = new Geo();
    g.mat(0.85, 0, 0, MATERIAL.WOOD).col(0.3, 0.22, 0.15).strut([0, 0, 0.5], [0, 0, -0.5], 0.36, 0.3, 8);
    for (let k = 0; k < 4; k++) {
        g.push(0, 0, 0, 0, 0, (k * PI) / 2);
        g.mat(0.85, 0, 0, MATERIAL.WOOD).col(0.3, 0.22, 0.15).strut([0, 0, 0], [0, 9, 0], 0.13, 0.07, 5);
        g.strut([1.7, 1.9, 0], [1.7, 8.7, 0], 0.035, 0.035, 4).strut([0.85, 1.9, 0], [0.85, 8.7, 0], 0.03, 0.03, 4);
        for (let y = 1.9; y <= 8.71; y += 0.85) g.strut([0, y, 0], [1.7, y, 0], 0.03, 0.03, 4);
        g.mat(0.95, 0, 0, MATERIAL.CLOTH).col(0.86, 0.82, 0.7);
        for (const s of [1, -1]) g.quad(g.vert(0.06, 1.95, 0.03 * s, 0, 0, s), g.vert(1.66, 1.95, 0.03 * s, 0, 0, s), g.vert(1.66, 8.65, 0.03 * s, 0, 0, s), g.vert(0.06, 8.65, 0.03 * s, 0, 0, s));
        g.pop();
    }
    T.rotor = registerMesh(g);

    castTown();
}

// who lives here: walkers on every circuit, and the people standing where the town left room for them
function castTown() {
    const town = W.town;
    people.length = gulls.length = 0;
    const cast = (kind: number): Pick<Person, 'kind' | 'tint'> => ({ kind, tint: kind === GUARD ? REDCOAT : CLOTHES[kind + ((Math.random() * (CLOTHES.length - kind)) | 0)] });
    for (const w of town.walks) {
        const at: number[] = [];
        let len = 0;
        for (let i = 0; i < w.pts.length; i++) {
            const a = w.pts[i],
                b = w.pts[(i + 1) % w.pts.length];
            at.push(len);
            len += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        }
        const path: Path = { pts: w.pts, at, len };
        for (let i = 0; i < w.n; i++) {
            const kind = w.guard ? GUARD : Math.random() < 0.36 ? WOMAN : MAN;
            people.push({
                ...cast(kind), path, d: ((i + Math.random() * 0.7) / w.n) * len, dir: w.guard || Math.random() < 0.6 ? 1 : -1, speed: w.guard ? 0.95 : rnd(0.95, 1.5),
                side: w.guard ? 0 : rnds(0.45), x: 0, y: 0, z: 0, yaw: 0, home: 0, stride: 1, rest: 0, phase: rnd(TAU), seed: rnd(100),
            });
        }
    }
    for (const [x, y, z, yaw] of town.idlers) {
        const kind = Math.random() < 0.3 ? WOMAN : MAN;
        people.push({ ...cast(kind), path: null, d: 0, dir: 1, speed: 0, side: 0, x, y, z, yaw, home: yaw, stride: 0, rest: 0, phase: 0, seed: rnd(100) });
    }
    // gulls: most wheel over the harbour, a few work the fishing boats and the fort
    for (let i = 0; i < 16; i++) {
        const [gx, gy, gz] = town.gulls,
            near = i < 11;
        gulls.push({ cx: gx + rnds(near ? 45 : 110), cz: gz + rnds(near ? 40 : 100), r: rnd(9, 34), y: gy + rnd(-12, 16), a: rnd(TAU), v: rnd(6, 9.5) * (Math.random() < 0.5 ? 1 : -1), seed: rnd(100) });
    }
}

// places a person on their circuit: position, and the way the leg they are on runs
function follow(p: Person, out: number[]) {
    const path = p.path!,
        n = path.pts.length;
    let d = p.d % path.len;
    if (d < 0) d += path.len;
    let i = n - 1;
    while (i > 0 && path.at[i] > d) i--;
    const a = path.pts[i],
        b = path.pts[(i + 1) % n],
        leg = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1,
        t = (d - path.at[i]) / leg,
        dx = (b[0] - a[0]) / leg,
        dz = (b[2] - a[2]) / leg;
    out[0] = a[0] + (b[0] - a[0]) * t - dz * p.side;
    out[1] = a[1] + (b[1] - a[1]) * t;
    out[2] = a[2] + (b[2] - a[2]) * t + dx * p.side;
    out[3] = dx * p.dir;
    out[4] = dz * p.dir;
}

const WHITE = [1, 1, 1];
const spot = [0, 0, 0, 0, 0];
// scratch poses: how someone strides, how they stand, and the mixture of the two they are in
const striding = newPose(),
    standing = newPose();

function drawPeople(dt: number) {
    const t = S.t;
    for (const p of people) {
        let wave = 0;
        if (p.path) {
            // now and then they stop: to look at the sea, to talk, to rest a load
            if (p.rest > 0) p.rest -= dt;
            else if (p.kind !== GUARD && Math.random() < dt / 34) p.rest = rnd(2, 7);
            p.stride = damp(p.stride, p.rest > 0 ? 0 : 1, 5, dt);
            p.d += p.speed * p.dir * p.stride * dt;
            // their feet keep the pace they are actually making, so that none of them slides
            p.phase += TAU * cadence(p.speed * p.stride) * p.stride * dt;
            follow(p, spot);
            p.x = spot[0];
            p.y = spot[1];
            p.z = spot[2];
            p.yaw += angDiff(p.yaw, Math.atan2(-spot[3], -spot[4])) * Math.min(1, dt * 5);
        } else {
            // standing about: shifting their weight, glancing round, a hand lifted in talk
            p.yaw = p.home + Math.sin(t * 0.23 + p.seed) * 0.35;
            wave = Math.max(0, Math.sin(t * 0.7 + p.seed * 3)) ** 3 * (0.5 + 0.5 * Math.sin(t * 5 + p.seed));
        }
        // somewhere between standing and their stride, as they slow to a stop or step off again
        const pose = standPose(standing, t, p.seed);
        if (p.stride > 0.01) mixPose(pose, gaitPose(striding, p.phase + p.seed, p.speed * p.stride), Math.min(1, p.stride * 1.5));
        if (p.kind === GUARD) {
            // a sentry's right hand is under the butt of his musket, and his eyes are front
            pose.armR = 0.15;
            pose.elbowR = 1.35;
            pose.headTurn *= 0.3;
        } else if (wave > 0) {
            pose.armR += wave * 0.9;
            pose.elbowR += wave * 1.3;
        }
        if (p.kind !== WOMAN) solvePose(pose);
        m4trs(Bm, p.x, p.y, p.z, p.yaw);
        drawFigure(T.parts[p.kind], Bm, pose, p.tint, WHITE, p.kind !== WOMAN);
    }
}

function drawGulls(dt: number) {
    const t = S.t;
    for (const g of gulls) {
        g.a += (g.v / g.r) * dt;
        const x = g.cx + Math.cos(g.a) * g.r + Math.sin(t * 0.05 + g.seed) * 14,
            z = g.cz + Math.sin(g.a) * g.r + Math.cos(t * 0.04 + g.seed * 2) * 14,
            y = g.y + Math.sin(t * 0.21 + g.seed) * 4,
            dir = Math.sign(g.v),
            // flapping in bursts, gliding between them
            beat = Math.max(0, Math.sin(t * 0.5 + g.seed)) ** 0.5,
            flap = Math.sin(t * 9.5 + g.seed) * 0.6 * beat + 0.12;
        m4trs(Bm, x, y, z, Math.atan2(Math.sin(g.a) * dir, -Math.cos(g.a) * dir), 0, -dir * 0.42, 1.3);
        addInstance(T.gull, Bm);
        for (const s of [-1, 1]) {
            m4trs(Lm, s * 0.07, 0.03, -0.02, 0, 0, s * flap, s, 1, 1);
            m4mul(Tm, Bm, Lm);
            addInstance(T.wing, Tm);
        }
    }
}

// boats and ships at their moorings ride the same swell the sea is drawn with
function drawMoorings() {
    const t = S.t,
        lamp = env.lamp;
    W.town.moorings.forEach((m, i) => {
        const big = m.kind >= 2,
            hull = big ? HULLS[m.kind === 2 ? 1 : 0] : null,
            hl = hull ? hull.len * 0.42 : m.kind ? 3.4 : 1.9,
            hb = hull ? hull.beam * 0.45 : m.kind ? 1.2 : 0.7,
            fx = -Math.sin(m.yaw),
            fz = -Math.cos(m.yaw),
            calm = shoreCalm(height(m.x, m.z)) * (big ? 1 : 1.5);
        const bow = seaHeight(m.x + fx * hl, m.z + fz * hl, t),
            aft = seaHeight(m.x - fx * hl, m.z - fz * hl, t),
            star = seaHeight(m.x - fz * hb, m.z + fx * hb, t),
            port = seaHeight(m.x + fz * hb, m.z - fx * hb, t),
            // a boat lying to a rope never sits quite still
            fidget = big ? 0.012 : 0.05,
            y = (bow + aft + star + port) * 0.25 * calm,
            pitch = Math.atan2((bow - aft) * calm, 2 * hl) + Math.sin(t * 1.3 + i * 2.1) * fidget * 0.5,
            roll = Math.atan2((star - port) * calm, 2 * hb) * 0.8 + Math.sin(t * 0.9 + i * 1.7) * fidget,
            yaw = m.yaw + Math.sin(t * 0.17 + i) * (big ? 0.012 : 0.07);
        m4trs(Bm, m.x, y, m.z, yaw, pitch, roll);
        const c = BOAT_PAINT[i % BOAT_PAINT.length];
        if (!hull) {
            addInstance(m.kind ? T.smack : T.rowboat, Bm, c[0], c[1], c[2]);
            return;
        }
        addInstance(hull.lod(Math.min(R.quality, 1), false), Bm, c[0] * 0.9, c[1] * 0.9, c[2] * 0.9);
        // her canvas is furled to the yards, her colours still fly
        for (const sl of hull.sails) {
            m4trs(Lm, 0, sl.y, sl.z, 0, 0, 0, sl.w, sl.h * 0.09, sl.w);
            m4mul(Tm, Bm, Lm);
            addInstance(sailMesh(Math.min(R.quality, 1)), Tm, 0.86, 0.8, 0.64);
        }
        m4trs(Lm, 0, hull.flag[1], hull.flag[2], 0, 0, 0, 2.4);
        m4mul(Tm, Bm, Lm);
        addInstance(MODELS.flag, Tm, c[0], c[1], c[2]);
        if (lamp > 0.05) {
            const [lx, ly, lz] = hull.lantern;
            sprite(0, Bm[0] * lx + Bm[4] * ly + Bm[8] * lz + Bm[12], Bm[1] * lx + Bm[5] * ly + Bm[9] * lz + Bm[13], Bm[2] * lx + Bm[6] * ly + Bm[10] * lz + Bm[14], 1.1 * lamp, 2.2, 1.3, 0.5, 0.8);
        }
    });
}

/** Advances and draws the life of the home port for this frame. With dt = 0 it re-submits the frozen scene. */
export function updateTown(dt: number) {
    const town = W.town,
        far = Math.hypot(cam.x - town.x, cam.z - town.z),
        t = S.t;
    if (far > TOWN_RANGE) return;
    drawMoorings();
    if (town.mill) {
        millA += dt * 0.62;
        m4trs(Bm, town.mill.x, town.mill.y, town.mill.z, town.mill.yaw, 0.09, millA);
        addInstance(T.rotor, Bm);
    }
    // the lighthouse: its beam sweeps round, and flashes as it crosses the eye
    if (env.lamp > 0.05 && town.beam.length) {
        const [x, y, z] = town.beam,
            toEye = Math.atan2(cam.z - z, cam.x - x),
            k = Math.max(0, Math.cos(toEye - t * 0.9)) ** 24 * env.lamp;
        sprite(0, x, y, z, 5 + 26 * k, 3 * k, 2.5 * k, 1.5 * k, 1);
        light(x + Math.cos(t * 0.9) * 26, y - 6, z + Math.sin(t * 0.9) * 26, 16 * env.lamp, 12 * env.lamp, 6 * env.lamp, 46);
    }
    if (far > PEOPLE_RANGE) return;
    drawPeople(dt);
    drawGulls(dt);
    if (dt <= 0) return;
    // smoke from the kitchen chimneys, leaning on the breeze
    for (const [x, y, z] of town.smokes) {
        if (Math.random() > dt * 2.2) continue;
        // by night it is only a paler patch against the stars
        const k = rnd(0.5, 0.66) * (0.3 + 0.7 * env.day);
        spawn(3, x + rnds(0.1), y, z + rnds(0.1), WIND_X * 0.45 + rnds(0.25), rnd(0.9, 1.6), WIND_Z * 0.45 + rnds(0.25), rnd(3.5, 6), 0.4, rnd(1.8, 3), k, k, k * 1.02, k * 1.2, k * 1.2, k * 1.25, 0.1 + 0.16 * env.day, 0, 0.12, -0.08);
    }
    // open fires: the tar pot in the yard, the fishermen's fire on the beach
    for (const [x, y, z] of town.flames) {
        if (Math.random() < dt * 16) spawn(1, x + rnds(0.16), y + rnd(0.15), z + rnds(0.16), rnds(0.3), rnd(1, 2), rnds(0.3), rnd(0.35, 0.65), 0.5, 0.14, 11, 5, 1, 2.2, 0.3, 0.02, 0.85, 1, 0.5, -2);
        if (Math.random() < dt * 3) spawn(3, x, y + 0.6, z, WIND_X * 0.4 + rnds(0.3), rnd(1.2, 2), WIND_Z * 0.4 + rnds(0.3), rnd(2.5, 4), 0.4, rnd(1.4, 2.2), 0.2, 0.18, 0.17, 0.3, 0.3, 0.32, 0.4, 0, 0.2, -0.12);
    }
}
