// The captain on his own two feet. The player is one pirate: he walks his ship's decks, goes
// ashore by her gangway or over her side, wades and swims, and walks any island he can reach. He
// has the ship only while he stands at her wheel: E takes it, and E gives it up again.
import { setListener, sfx } from '@ryqndev/brinewake-audio';
import { addInstance, cam, Geo, MATERIAL, registerMesh, seaHeight, setCamera, shoreCalm } from '@ryqndev/brinewake-renderer';
import { keys, mouse, opts } from '@ryqndev/kiln-core';
import { angDiff, clamp, damp, lerp, m4, m4aim, m4mul, m4trs, smooth, TAU } from '@ryqndev/kiln-math';

import { afloat, cabinWidth, deck, deckAt, fromShip, toShip, trim, tweenWidth } from './deck';
import { airPose, cadence, copyPose, cutPose, drawFigure, flowPose, gaitPose, gunPose, helmPose, leading, mixPose, newCarry, newPose, type Parts, type Pose, RIG, solvePose, standPose, swimPose } from './figure';
import { fxSplash } from './fx';
import { hud } from './hud';
import { flightY } from './hull/stairs';
import { M } from './models';
import { NET } from './net/role';
import { COATS, helmsman } from './posts';
import type { Ship } from './ships';
import { newSpring, type Spring, springTo } from './spring';
import { ON, PL, S } from './state';
import { type Block, height, PLAN, toLocal, W } from './world';

/** Metres a second: at a walk, at a run (Shift), and swimming. */
const WALK = 3.3,
    RUN = 6,
    SWIM = 2.5;
/** How deep he can stand before he has to swim, and how much of him is under when he does. */
const WADE = 0.95;
export const AFLOAT = 1.3;
/** The steepest ground he will climb, as rise over run. */
const STEEP = 1.5;
/** How fast his ship may be going for him to go over her side, or to climb back up it, m/s. */
const WAY = 3;
/** How near her side he must swim to climb aboard, and how near the wheel he must stand to take it, metres. */
const REACH = 3,
    HELM = 1.5;
/** The highest thing he steps up onto without jumping, and how much room he takes up, metres. */
const STEP = 0.6,
    GIRTH = 0.28;
/** How far outside the deck he can stand on her planking is: nobody in the water gets nearer her middle than that. */
const PLANKING = 0.75;
/** How close to him the camera can come before he is in its way, metres. */
const IN_THE_WAY = 0.75;
/** On a flight of her steps: how much of his pace he keeps, and how far inside its stringers his feet stay, metres. */
const ON_STEPS = 0.62,
    STRINGER = 0.1;
/** How far behind him the camera stands in a cabin, where there is no room for more, metres. */
const CABIN_CAMERA = 2.3;
/** How far abaft the wheel's hub whoever steers stands. */
export const ABAFT = 0.62;
/** His size against the townsfolk: he is the one the eye should find. */
export const BUILD = 1.08;
/** How far from his ship someone in the water must be, or how long in it, before a line is thrown to him: only in a crew. Metres, seconds. */
const LEFT_BEHIND = 30,
    SOAKED = 4;
/** The gangway: how far aft of the middle of the berth it lands, and how far in from the wharf's face. */
const GANG_AFT = 1.8,
    GANG_IN = 1.5;
const FOV = 1;

/** How fast he leaves the ground when he jumps, and what brings him back, m/s and m/s². */
const JUMP = 6.4,
    GRAVITY = 22;

// How he moves is sprung, not switched (see spring.ts): each of these is the time, in seconds, in
// which half of a change is made.
/** Getting under way, pulling up, and changing his way where there is nothing to push against (in the air, in the water). */
const GATHER = 0.1,
    CHECK = 0.075,
    ADRIFT = 0.3;
/** Coming round to face the way he is going. */
const COME_ROUND = 0.07;
/** One movement running into the next: a stride into a jump, a fall into a landing. */
const BLEND = 0.07;
/** His weight going over as he picks up speed, pulls up or turns; and his knees giving under a landing. */
const HEEL = 0.09,
    GIVE = 0.1;
/** A foot let go of the ground catching up with where it should be; and a foot finding the height and slope of the ground under it. */
const CATCH_UP = 0.055,
    FIND = 0.035;

/** How far over he leans for each m/s² he is gathering or losing, and the most he leans, radians. */
const LEAN = 0.011,
    LEAN_MOST = 0.25;
/** How much of the speed he came down at his knees have to take up. */
const IMPACT = 1.15;
/**
 * A planted foot stays where it was put. It is taken up and set down again when the body has left
 * it this far behind: standing, and in the middle of a stride, metres; or has turned this far over it, radians.
 */
const STRAY = 0.13,
    STRAY_STRIDING = 0.34,
    ASKEW = 0.6;
/** How far above or below his own footing a foot will reach for the ground under it, metres. */
const FOOTING = 0.45;

let C: Parts;
const Bm = m4(),
    Lm = m4(),
    Tm = m4();
// The pose the movement he is making asks for; that, carried over from the movement before; and what is drawn.
const src = newPose(),
    stride = newPose(),
    pose = newPose(),
    carry = newCarry();
// which movement that is: a change of it is what is carried over
const MOVE = { GROUND: 0, AIR: 1, SWIM: 2, HELM: 3, GUN: 4 };
let move = -1;
// seconds he has been ashore since he was last put there, for the hint that sends him aboard
let ashore = 0;
// seconds he has been in the water since he was last out of it
let soaked = 0;
// His way over the ground, sprung toward the way the player asks for: x is a speed and v how fast it is changing.
const wayX = newSpring(),
    wayZ = newSpring();
// the way he is turning to face, and (in v) how fast he is coming round to it
let bound = 0;
const turning = newSpring();
// his weight thrown forward and to his right, and how far his knees have given
const pitch = newSpring(),
    heel = newSpring(),
    give = newSpring();
// how fast he was falling when he last came down; which leg he jumped off, and how much of a running jump it was
let impact = 0,
    lead = -1,
    launch = 1;

// One of his feet on the ground. While it is planted it stays where it was put, in the world or on
// his ship's deck, whatever the rest of him does; when it is let go, or set down somewhere new, how
// far that moved it is kept and dies away, so that it never jumps.
interface Sole {
    planted: boolean;
    /** planted on his ship's deck: then x, z and yaw are in her frame, not the world's */
    aboard: boolean;
    x: number;
    z: number;
    yaw: number;
    /** what it is still carrying from where it was: across the world's x and z, and in the way it points */
    ox: Spring;
    oz: Spring;
    turn: Spring;
    /** how far it had to go when it was last moved, for the arc of the step that takes it there */
    span: number;
    /** the ground under it against the ground under him, and the slope of it under the foot */
    rise: Spring;
    slope: Spring;
    /** where its ankle went this frame, in the world: for whoever wants to see that it is not sliding */
    wx: number;
    wy: number;
    wz: number;
}
const newSole = (): Sole => ({ planted: false, aboard: false, x: 0, z: 0, yaw: 0, ox: newSpring(), oz: newSpring(), turn: newSpring(), span: 0, rise: newSpring(), slope: newSpring(), wx: 0, wy: 0, wz: 0 });
const soles = [newSole(), newSole()];
/** Debug: his feet, and the pose he is drawn in. */
export const captainRig = { soles, pose };

/** The meshes he is built of: the rest of a crew are drawn with the same (mates.ts). */
export const captainParts = () => C;

// he is on her weather decks: not in her cabin, not on a deck below, not on the steps between them
function topside() {
    const me = PL.me;
    me.below = false;
    me.tier = 0;
    me.flight = -1;
}
/** Whether he has a deck over his head: in her cabin, on a deck below, or on a companionway going down to one. */
const covered = () => PL.me.below || PL.me.tier > 0 || (PL.me.flight >= 0 && (PL.ship.hull.flights[PL.me.flight]?.foot ?? 0) > 0);

/** Stands him still, facing a way: no speed carried, nothing left to turn. */
export function settle(yaw: number) {
    const me = PL.me;
    me.yaw = bound = yaw;
    me.speed = me.vy = 0;
    wayX.x = wayX.v = wayZ.x = wayZ.v = turning.x = turning.v = 0;
}

/** Builds the captain's meshes to the common skeleton (figure.ts): each part round its own joint, the figure facing -Z. */
export function buildCaptain() {
    const plain = (g: Geo, c: number[], rough = 0.85) => g.mat(rough, 0, 0, MATERIAL.METAL).col(c[0], c[1], c[2]);
    const brass = (g: Geo) => g.mat(0.3, 0.95, 0, MATERIAL.METAL).col(0.9, 0.68, 0.22);
    // his coat takes his ship's colours
    const coat = (g: Geo) => g.mat(0.8, 0, 0, MATERIAL.PAINT).col(1, 1, 1);
    const SKIN = [0.78, 0.57, 0.43],
        LINEN = [0.9, 0.87, 0.78],
        BLACK = [0.05, 0.05, 0.055],
        BREECHES = [0.2, 0.17, 0.15],
        LEATHER = [0.2, 0.13, 0.08],
        SASH = [0.62, 0.09, 0.08];

    // his hips: breeches, a sash knotted at the left, the skirts of his coat behind, and the cutlass that hangs from his belt
    let g = new Geo();
    plain(g, BREECHES).push(0, -0.01, 0).box(0.18, 0.085, 0.11, 0.03).pop();
    coat(g).push(0, -0.3, 0.02).lathe([[0.25, 0, 1, 0.25], [0.19, 0.38, 1, 0.25]], 9, Math.PI).pop();
    plain(g, SASH).push(0, 0.085, 0).box(0.2, 0.05, 0.125, 0.02).pop().push(-0.16, -0.04, -0.1).box(0.035, 0.1, 0.012, 0.005).pop();
    g.mat(0.35, 0.9, 0, MATERIAL.METAL).col(0.55, 0.56, 0.6).strut([-0.25, 0.04, 0.02], [-0.32, -0.54, 0.3], 0.028, 0.012, 5);
    brass(g).push(-0.245, 0.07, 0.01).sphere(0.05, 6, 4).pop();
    const pelvis = registerMesh(g);

    // his chest: a coat broad at the shoulder and nipped at the waist, open over a linen shirt; epaulettes, buttons, a cross-belt
    g = new Geo();
    coat(g).push(0, 0.31, 0.005).box(0.205, 0.16, 0.12, 0.05).pop().push(0, 0.08, 0.005).box(0.18, 0.12, 0.11, 0.04).pop();
    for (const side of [-1, 1]) g.push(side * 0.22, 0.435, 0).sphere(0.085, 8, 5).pop();
    brass(g);
    for (const side of [-1, 1]) g.push(side * 0.235, 0.5, 0).box(0.07, 0.014, 0.075, 0.01).pop();
    for (let i = 0; i < 4; i++) g.push(0.105, 0.36 - i * 0.1, -0.128).sphere(0.016, 5, 3).pop();
    plain(g, LINEN).push(0, 0.22, -0.108).box(0.08, 0.24, 0.02, 0.01).pop();
    plain(g, LEATHER).push(0, 0.2, -0.132, 0, 0, 0.62).box(0.028, 0.31, 0.008, 0).pop();
    const chest = registerMesh(g);

    // his head on its neck: a nose, one good eye and a patch over the other, a black beard, and a cocked hat edged with gold with a feather in it
    g = new Geo();
    plain(g, SKIN).push(0, -0.03, 0).cyl(0.055, 0.1, 7, 0.01).pop();
    g.push(0, 0.12, 0, 0, 0, 0, 0.95, 1.06, 1).sphere(0.12, 10, 7).pop();
    g.push(0, 0.1, -0.12).box(0.017, 0.024, 0.02, 0.008).pop();
    plain(g, BLACK).push(0.044, 0.14, -0.105).sphere(0.017, 5, 4).pop();
    g.push(-0.046, 0.142, -0.108).box(0.03, 0.026, 0.012, 0.008).pop();
    g.push(0, 0.17, -0.01, 0, 0, 0.32).box(0.125, 0.009, 0.118, 0).pop();
    g.push(0, 0.045, -0.04, 0, 0, 0, 1, 0.78, 0.92).sphere(0.108, 9, 5).pop();
    g.push(0, 0.14, 0.035, 0, 0, 0, 1, 0.95, 0.95).sphere(0.124, 9, 6).pop();
    g.push(0, 0.195, 0).cyl(0.3, 0.05, 3, 0, 0.25).pop().push(0, 0.215, 0).cyl(0.13, 0.1, 9, 0.02, 0.11).pop();
    brass(g).push(0, 0.243, 0).cyl(0.262, 0.012, 3, 0).pop();
    plain(g, SASH).strut([0.1, 0.27, 0.06], [0.2, 0.45, 0.2], 0.03, 0.008, 4);
    const head = registerMesh(g);

    // legs: breeches to the knee; then a sea boot, turned down below it; and its foot
    g = new Geo();
    plain(g, BREECHES).push(0, -RIG.thigh / 2, 0).box(0.082, RIG.thigh / 2 + 0.02, 0.092, 0.035).pop();
    const thigh = registerMesh(g);
    g = new Geo();
    plain(g, BREECHES).push(0, -0.02, 0).sphere(0.08, 7, 5).pop();
    plain(g, LEATHER).push(0, -0.07, 0).box(0.094, 0.05, 0.102, 0.02).pop();
    plain(g, BLACK).push(0, -RIG.shin / 2 - 0.04, 0).box(0.08, RIG.shin / 2 - 0.02, 0.088, 0.03).pop();
    const shin = registerMesh(g);
    g = new Geo();
    plain(g, BLACK).push(0, -RIG.ankle + 0.05, -0.045).box(0.078, 0.05, 0.135, 0.03).pop().push(0, 0, 0).sphere(0.075, 7, 5).pop();
    const foot = registerMesh(g);
    // arms: a coat sleeve to the elbow; then the forearm, a deep cuff with linen showing, and a hand
    g = new Geo();
    coat(g).push(0, -RIG.upper / 2, 0).box(0.06, RIG.upper / 2 + 0.02, 0.064, 0.028).pop();
    const upper = registerMesh(g);
    g = new Geo();
    coat(g).push(0, -0.02, 0).sphere(0.06, 6, 4).pop().push(0, -0.1, 0).box(0.054, 0.1, 0.058, 0.024).pop().push(0, -0.19, 0).box(0.066, 0.035, 0.07, 0.02).pop();
    plain(g, LINEN).push(0, -0.235, 0).box(0.05, 0.02, 0.054, 0.01).pop();
    plain(g, SKIN).push(0, -RIG.fore + 0.03, 0).sphere(0.057, 7, 5).pop();
    const fore = registerMesh(g);
    C = { pelvis, chest, head, thigh, shin, foot, upper, fore };
}

// ---- where he can stand: see deck.ts for his ship's deck ----

// The gangway, while she lies at her berth: from the deck inside her port bulwark, up over her rail
// and across to the wharf. Each end as [x, y, z].
const gang = { on: false, inner: [0, 0, 0], rail: [0, 0, 0], wharf: [0, 0, 0] };
function layGangway() {
    gang.on = PL.berthed;
    if (!gang.on) return;
    const s = PL.ship,
        b = W.port.berth,
        ax = Math.sin(b.yaw),
        az = Math.cos(b.yaw);
    gang.wharf[0] = b.x + ax * GANG_AFT - b.nx * GANG_IN;
    gang.wharf[1] = PLAN.quayY;
    gang.wharf[2] = b.z + az * GANG_AFT - b.nz * GANG_IN;
    const lz = toShip(s, gang.wharf[0], gang.wharf[2]).z;
    deckAt(s, lz, true);
    const y = deck.y,
        w = deck.w * s.scale;
    let p = fromShip(s, -(w - 0.3), lz);
    gang.inner[0] = p.x;
    gang.inner[1] = afloat(s, -(w - 0.3), y, lz);
    gang.inner[2] = p.z;
    p = fromShip(s, -(w + 0.45), lz);
    gang.rail[0] = p.x;
    gang.rail[1] = afloat(s, -(w + 0.45), s.hull.rail, lz);
    gang.rail[2] = p.z;
}

// ---- what is built ashore: see Block in world/types.ts, and Mason.block for where they come from ----

// The height of a block's top at a point, if the point is inside it (grown by `pad` all round); else -Infinity.
function topAt(b: Block, x: number, z: number, pad: number) {
    const dx = x - b.x,
        dz = z - b.z,
        along = b.s * dx + b.c * dz;
    if (Math.abs(along) > b.hd + pad || Math.abs(b.c * dx - b.s * dz) > b.hw + pad) return -Infinity;
    return b.y0 + (b.y1 - b.y0) * clamp((along + b.hd) / (2 * b.hd), 0, 1);
}

/** The highest built thing at a point that someone whose feet are at `y` could be standing on, or -Infinity. */
function standing(x: number, z: number, y: number) {
    let best = -Infinity;
    for (const b of W.blocks) {
        if (!b.deck) continue;
        const top = topAt(b, x, z, 0);
        if (top > best && top <= y + STEP) best = top;
    }
    return best;
}

// what last barred his way, if it was something built: the way its face looks (a unit vector), and whether it is round
const face = { hit: false, x: 0, z: 0, round: false };

/**
 * Whether something built stands in the way at a point, of someone whose feet are at `y`: a wall,
 * or anything too high to step up onto. When it does, `face` says which way its face looks there,
 * so that he can be slid along it.
 */
function barred(x: number, z: number, y: number) {
    for (const b of W.blocks) {
        const top = topAt(b, x, z, GIRTH);
        if (top === -Infinity || (b.deck && y >= top - STEP)) continue;
        // the face he has come up against is the one he is least far inside
        const dx = x - b.x,
            dz = z - b.z,
            across = b.c * dx - b.s * dz,
            along = b.s * dx + b.c * dz,
            side = b.hw + GIRTH - Math.abs(across) < b.hd + GIRTH - Math.abs(along);
        face.hit = true;
        face.round = false;
        face.x = (side ? b.c : b.s) * Math.sign(side ? across : along);
        face.z = (side ? -b.s : b.c) * Math.sign(side ? across : along);
        return true;
    }
    for (const p of W.posts) {
        const dx = x - p[0],
            dz = z - p[1],
            d = Math.hypot(dx, dz);
        if (y >= p[3] - STEP || d >= p[2] + GIRTH) continue;
        face.hit = face.round = true;
        face.x = dx / (d || 1);
        face.z = dz / (d || 1);
        return true;
    }
    return false;
}

// What is under a point of the world, for someone standing as `from` says: which of ON, and how high.
const under = { on: 0, y: 0, built: false, below: false };

// Whether he would be in her cabin at a point of her deck: he is in it already and still abaft its
// bulkhead, or he is coming aft off her open deck through its door. Anywhere else abaft that
// bulkhead he is on the quarterdeck over it.
function goesBelow(s: Ship, lx: number, lz: number) {
    const c = s.hull.cabin,
        me = PL.me;
    if (!c || me.tier > 0 || me.flight >= 0 || lz < c.z0 * s.scale) return false;
    return me.below || (me.on === ON.DECK && me.lz < c.z0 * s.scale && Math.abs(lx) < c.door * s.scale);
}

function ground(x: number, z: number, from: number, fromY: number) {
    const s = PL.ship;
    under.built = under.below = false;
    // his own deck, if he is on it already: nobody walks up a ship's side. A wreck going down under a
    // crew is no deck at all: it leaves them in the water, to be picked up by the ship that replaces her.
    if ((from === ON.DECK || from === ON.PLANK) && !(NET.on && s.dead)) {
        const l = toShip(s, x, z),
            me = PL.me,
            flight = s.hull.flights[me.flight];
        // on a flight of her steps, or on a deck below: there is always something of hers under him
        if (from === ON.DECK && (flight || (me.tier > 0 && s.hull.tweens[me.tier - 1]))) {
            if (!flight) deckAt(s, l.z, true, false, me.tier);
            under.on = ON.DECK;
            under.y = afloat(s, l.x, flight ? flightY(flight, l.z / s.scale) : deck.y, l.z);
            return under;
        }
        const below = goesBelow(s, l.x, l.z);
        if (deckAt(s, l.z, false, below) && Math.abs(l.x) <= deck.w * s.scale) {
            under.on = ON.DECK;
            under.y = afloat(s, l.x, deck.y, l.z);
            under.below = below;
            return under;
        }
    }
    // the gangway: up from the deck to her rail, then across to the wharf
    if (gang.on && from !== ON.SEA) {
        const a = gang.inner,
            r = gang.rail,
            b = gang.wharf,
            dx = b[0] - a[0],
            dz = b[2] - a[2],
            len2 = dx * dx + dz * dz,
            u = ((x - a[0]) * dx + (z - a[2]) * dz) / len2;
        if (u >= 0 && u <= 1 && Math.abs((x - a[0]) * dz - (z - a[2]) * dx) / Math.sqrt(len2) < 0.55) {
            const ur = Math.hypot(r[0] - a[0], r[2] - a[2]) / Math.sqrt(len2);
            under.on = ON.PLANK;
            under.y = u < ur ? a[1] + ((r[1] - a[1]) * u) / ur : r[1] + ((b[1] - r[1]) * (u - ur)) / (1 - ur);
            return under;
        }
    }
    // what the port is built of, for anyone already up at its level: the quay along the waterfront, the
    // wharf and its head, and the fishing jetty. All of it stands over water or over the foot of the shore.
    const [lx, lz] = toLocal(x, z),
        P = PLAN,
        hd = P.head,
        quay = lz >= -0.6 && lz < 13 && lx > P.quayLeft && lx < P.right + 10,
        wharf = lz < 0 && ((Math.abs(lx) < hd.hw - 0.1 && lz > hd.z - hd.hd + 0.1 && lz < hd.z + hd.hd) || (Math.abs(lx) < 2.9 && lz >= hd.z + hd.hd) || (Math.abs(lx + 44) < 1.4 && lz > -28.9));
    if (fromY > P.quayY - 0.8 && (quay || wharf)) {
        under.on = ON.LAND;
        under.y = P.quayY;
        return under;
    }
    let h = height(x, z);
    // the town is paved a little above the ground it is laid on
    if (lz >= -0.7 && lz < P.back && lx > P.quayLeft && lx < P.right + 10) h += 0.1;
    // and whatever is built there that he is level with: a terrace, a flight of steps, the top of a wall
    const up = standing(x, z, fromY);
    if (up > h) {
        h = up;
        under.built = true;
    }
    if (h > -WADE) {
        under.on = ON.LAND;
        under.y = h;
        return under;
    }
    under.on = ON.SEA;
    under.y = seaHeight(x, z, S.t) * shoreCalm(h) - AFLOAT;
    return under;
}

// whether his ship is slow enough, and near enough, for him to climb her side from the water
function canClimb() {
    const me = PL.me,
        s = PL.ship;
    if (s.dead || Math.abs(s.v) > WAY) return false;
    const l = toShip(s, me.x, me.z);
    deckAt(s, l.z, true);
    return Math.abs(l.x) < deck.w * s.scale + REACH && Math.abs(l.z) < s.hl + REACH;
}

/** Whether he stands where whoever steers stands. */
export function atWheel() {
    const me = PL.me,
        s = PL.ship,
        h = s.hull.helm;
    return me.on === ON.DECK && Math.hypot(me.lx, me.lz - (h[2] + ABAFT) * s.scale) < HELM && Math.abs(me.y - afloat(s, 0, h[1], (h[2] + ABAFT) * s.scale)) < 0.7;
}

/** Stands him on his ship's deck at a point of her own frame. */
export function stand(lx: number, lz: number) {
    const me = PL.me,
        s = PL.ship;
    trim(s);
    deckAt(s, lz, true);
    lx = clamp(lx, -(deck.w * s.scale - 0.1), deck.w * s.scale - 0.1);
    const p = fromShip(s, lx, lz);
    me.x = p.x;
    me.z = p.z;
    me.y = afloat(s, lx, deck.y, lz);
    me.lx = lx;
    me.lz = lz;
    me.on = ON.DECK;
    topside();
    me.heading = s.yaw;
    me.vy = 0;
    me.air = false;
}

/** Puts the captain on the wharf beside his ship, at the foot of her gangway. */
export function spawnCaptain() {
    const me = PL.me,
        b = W.port.berth,
        // in a crew they line up along the wharf, each a pace from the next, not all on one spot
        aft = GANG_AFT + (NET.on ? NET.me * 1.1 : 0);
    me.x = b.x + Math.sin(b.yaw) * aft - b.nx * (GANG_IN + 2.2);
    me.z = b.z + Math.cos(b.yaw) * aft - b.nz * (GANG_IN + 2.2);
    me.y = PLAN.quayY;
    // facing his ship, and the camera at his back
    settle(Math.atan2(-b.nx, -b.nz));
    me.on = ON.LAND;
    topside();
    me.air = false;
    ashore = 0;
    PL.afoot = true;
    PL.gun = -1;
    PL.camYaw = me.yaw;
    PL.camPitch = -0.22;
    PL.dist = 1;
}

/** Puts him aboard his ship amidships, wherever she is: how a hand joins a crew already at sea, and how one left behind is fetched. */
export function spawnAboard() {
    const s = PL.ship;
    // clear of her masts
    let lz = 0;
    while (s.hull.masts.some((mz) => Math.abs(lz - mz * s.scale) < 1.1)) lz += 0.6;
    stand(0, lz);
    settle(s.yaw);
    ashore = soaked = 0;
    PL.afoot = true;
    PL.gun = -1;
    PL.camYaw = s.yaw;
    PL.camPitch = -0.22;
    PL.dist = 1;
}

/** He takes the wheel: from here the player has the ship. */
function takeHelm() {
    const s = PL.ship,
        other = helmsman();
    if (other) {
        hud.toast(other.name + ' has the wheel');
        return;
    }
    PL.afoot = false;
    PL.camYaw = s.yaw + 0.5;
    PL.camPitch = -0.2;
    PL.dist = 1;
    sfx.ui();
}

/**
 * He gives up the wheel and stands by it: her canvas comes off, and she lies where she is. In a crew
 * she is left as she was set, for whoever takes the wheel next: only her helm is put amidships.
 */
export function leaveHelm() {
    const s = PL.ship;
    if (!NET.on) {
        if (s.sail > 0) sfx.sail(false);
        s.sail = 0;
    }
    s.rudder = 0;
    mouse.l = mouse.r = false;
    PL.afoot = true;
    PL.canDock = false;
    PL.side = -1;
    PL.zoom = 0;
    stand(0, (s.hull.helm[2] + ABAFT) * s.scale);
    settle(s.yaw);
    PL.camYaw = s.yaw;
    PL.camPitch = -0.25;
    PL.dist = 1;
    sfx.ui();
    if (!NET.on) hud.toast('E by the wheel takes it again · run at her rail to go over the side');
}

// in a crew, whether he is in the water with no way back aboard by himself: she has left him, or will not stop for him
const adrift = () => NET.on && PL.me.on === ON.SEA && !PL.ship.dead && (soaked > SOAKED || Math.hypot(PL.me.x - PL.ship.x, PL.me.z - PL.ship.z) > PL.ship.hl + LEFT_BEHIND);

/** Space: he jumps, if he has his feet on something to jump from. */
export function jump() {
    const me = PL.me;
    // nor under her beams, nor on her steps: there is no room to
    if (!PL.afoot || me.air || covered() || me.flight >= 0 || me.on === ON.SEA || (me.on === ON.LAND && me.y < -0.35)) return;
    me.air = true;
    me.vy = JUMP;
    // off whichever foot is under him, if he is going at any pace
    lead = leading(me.phase);
    launch = smooth(0.5, 3, me.speed);
}

/**
 * E: at the wheel it takes the helm or gives it up; in the water under his ship's side it climbs
 * aboard; and in a crew, someone the ship has left behind in the water is hauled back to her on a line.
 */
export function interact() {
    if (!PL.afoot) leaveHelm();
    else if (atWheel()) takeHelm();
    else if (PL.me.on !== ON.DECK && PL.me.on !== ON.PLANK && canClimb()) {
        const l = toShip(PL.ship, PL.me.x, PL.me.z);
        stand(l.x * 0.7, clamp(l.z, -PL.ship.hl * 0.85, PL.ship.hl * 0.85));
        sfx.ui();
    } else if (adrift()) {
        spawnAboard();
        sfx.ui();
    }
}

/** The turns he tries, either way, when the way ahead is shut by something of his ship's: he slides along a bulwark and round a mast. */
const SIDESTEPS = [0.6, -0.6, 1.2, -1.2];

const running = () => !!(keys.ShiftLeft || keys.ShiftRight);

// Where a pace aboard her would leave him, as aboardAt() last found it: the tier he would be on, and the flight of steps.
const next = { tier: 0, flight: -1 };

/**
 * Whether he can put a foot at a point of his ship's own frame, as far as her decks and the steps
 * between them go, and where that would leave him (in `next`). `below` is whether the point is in
 * her cabin. He goes onto a flight only over the end of it that stands on the deck he is on, and
 * from one of her weather decks to another only by a flight: where a deck is raised over the next
 * there is a bulkhead to anyone below it and a rail to anyone on it, which he clears only in the air.
 */
function aboardAt(s: Ship, lx: number, lz: number, below: boolean): boolean {
    const me = PL.me,
        h = s.hull,
        k = s.scale,
        x = lx / k,
        z = lz / k,
        pz = me.lz / k,
        girth = GIRTH / k,
        on = h.flights[me.flight];
    next.tier = me.tier;
    next.flight = on ? me.flight : -1;
    if (on) {
        // between its stringers, until he walks off one end of it
        if (x < on.x0 + STRINGER || x > on.x1 - STRINGER) return false;
        const u = (z - on.zTop) / (on.zFoot - on.zTop);
        if (u >= 0 && u <= 1) return true;
        next.flight = -1;
        next.tier = u < 0 ? on.top : on.foot;
    } else {
        // the deck he is standing on, to tell which end of a flight is his
        deckAt(s, me.lz, true, me.below, me.tier);
        const here = deck.y;
        let barred = false;
        for (let i = 0; i < h.flights.length; i++) {
            const f = h.flights[i],
                head = f.top === me.tier && Math.abs(here - f.yTop) < 0.5,
                foot = f.foot === me.tier && Math.abs(here - f.yFoot) < 0.5;
            if ((!head && !foot) || x < f.x0 - STRINGER || x > f.x1 + STRINGER || z < Math.min(f.zTop, f.zFoot) - 0.05 || z > Math.max(f.zTop, f.zFoot) + 0.05) continue;
            const up = Math.sign(f.zTop - f.zFoot),
                lane = x > f.x0 + STRINGER && x < f.x1 - STRINGER;
            if (lane && ((head && (pz - f.zTop) * up >= -0.03) || (foot && (f.zFoot - pz) * up >= -0.03))) {
                next.flight = i;
                return true;
            }
            barred = true;
        }
        if (barred) return false;
    }
    if (next.tier > 0) {
        // a deck below: within her sides, between its bulkheads, and round what is stowed on it
        const t = h.tweens[next.tier - 1];
        if (!t || z < t.z0 || z > t.z1 || Math.abs(x) > tweenWidth(t, z)) return false;
        for (const b of t.blocks) if (x > b[0] - girth && x < b[1] + girth && z > b[2] - girth && z < b[3] + girth) return false;
        return true;
    }
    if (below || me.below) return true;
    deckAt(s, lz, true);
    const to = deck.y;
    // round what stands on the deck he is going onto
    for (const o of h.walk.stands) if (Math.abs(o[3] - to) < 0.7 && Math.hypot(x - o[0], z - o[1]) < o[2] + 0.5 * girth) return false;
    if (!on) {
        deckAt(s, me.lz, true);
        if (to - deck.y > STEP / k || (deck.y - to > STEP / k && !me.air)) return false;
    }
    return true;
}

// one pace to a point, if there is somewhere to put a foot there
function step(nx: number, nz: number): boolean {
    const me = PL.me,
        s = PL.ship,
        aboard = me.on === ON.DECK || me.on === ON.PLANK,
        g = ground(nx, nz, me.on, me.y),
        below = g.on === ON.DECK && g.below;
    face.hit = false;
    next.tier = 0;
    next.flight = -1;
    if (g.on === ON.DECK) {
        const l = toShip(s, nx, nz),
            h = s.hull,
            c = h.cabin;
        if (c && me.below) {
            // out of her cabin only by its door; and in it, not through its locker or its furniture
            if (!below && Math.abs(l.x) > c.door * s.scale) return false;
            if (below && l.z > c.z1 * s.scale) return false;
            if (below) for (const b of c.blocks) if (l.x > b[0] * s.scale - GIRTH && l.x < b[1] * s.scale + GIRTH && l.z > b[2] * s.scale - GIRTH && l.z < b[3] * s.scale + GIRTH) return false;
        }
        // her decks, and the steps between them
        if (me.on === ON.DECK && !aboardAt(s, l.x, l.z, below)) return false;
        // round her masts and her wheel, not through them
        for (const mz of h.masts) if (Math.hypot(l.x, l.z - mz * s.scale) < 0.62) return false;
        if (Math.hypot(l.x, l.z - (h.helm[2] - 0.2) * s.scale) < 0.55 && Math.abs(g.y - afloat(s, 0, h.helm[1], h.helm[2] * s.scale)) < 0.6) return false;
    }
    // nobody leaves a cabin, or a deck below, through her side
    else if (me.below || me.tier > 0 || me.flight >= 0) return false;
    else if (aboard) {
        // over the side: her bulwark stops a man at a walk; he vaults it at a run or clears it with a jump, and neither with way on her
        if (me.on === ON.DECK && g.on !== ON.PLANK && ((!running() && !me.air) || Math.abs(s.v) > WAY)) return false;
    } else {
        // nor through anything built ashore
        if (barred(nx, nz, me.y)) return false;
        // nobody swims or wades through her hull
        const l = toShip(s, nx, nz);
        if (!s.dead && deckAt(s, l.z) && Math.abs(l.x) < deck.w * s.scale + PLANKING) return false;
        // a bank too steep to climb stops him; a step he can take (see STEP) does not
        if (g.on === ON.LAND && me.on === ON.LAND && !g.built && g.y - me.y > Math.hypot(nx - me.x, nz - me.z) * STEEP + 0.03) return false;
    }
    me.x = nx;
    me.z = nz;
    me.below = below;
    if (g.on === ON.DECK && me.on === ON.DECK) {
        me.tier = next.tier;
        me.flight = next.flight;
    }
    return true;
}

// the camera has come so close to him that he would only be in its way: he is left out of the picture
let unseen = false;

/**
 * The camera at the captain's back: the same line of sight the ship is watched along, drawn in close.
 * In a cabin it comes in over his shoulder and is kept inside the room with him, under its beams
 * and within her sides; with his back to a wall it is where his own eyes are.
 */
export function captainCamera() {
    const me = PL.me,
        s = PL.ship,
        c = s.hull.cabin,
        cp = Math.cos(PL.camPitch),
        fx = -Math.sin(PL.camYaw) * cp,
        fy = Math.sin(PL.camPitch),
        fz = -Math.cos(PL.camYaw) * cp;
    let dist = 5.4 * PL.dist,
        x = me.x - fx * dist,
        z = me.z - fz * dist,
        y = 0;
    unseen = false;
    const k = s.scale,
        flight = s.hull.flights[me.flight],
        tween = s.hull.tweens[me.tier - 1];
    if (me.on === ON.DECK && covered()) {
        // Under her decks it comes in over his shoulder, and is kept in the room he is in: within its
        // sides, over its floor and under its beams. On a companionway that is the hatch over the steps.
        dist = Math.min(dist, CABIN_CAMERA);
        const l = toShip(s, me.x - fx * dist, me.z - fz * dist);
        let lx = l.x,
            lz = l.z,
            floor = 0,
            head = 0;
        if (flight) {
            lz = clamp(l.z, (Math.min(flight.zTop, flight.zFoot) + 0.2) * k, (Math.max(flight.zTop, flight.zFoot) - 0.2) * k);
            lx = clamp(l.x, (flight.x0 + 0.22) * k, (flight.x1 - 0.22) * k);
            floor = flightY(flight, lz / k) + 0.55;
            head = floor + 1.75;
        } else if (tween) {
            lz = clamp(l.z, tween.z0 * k + 0.3, tween.z1 * k - 0.3);
            const w = tweenWidth(tween, lz / k) * k + 0.05;
            lx = clamp(l.x, -w, w);
            floor = tween.y + 0.45;
            head = tween.head - 0.3;
        } else if (c) {
            lz = clamp(l.z, c.z0 * k + 0.3, c.z1 * k + 0.25);
            const w = cabinWidth(c, lz / k) * k + 0.08;
            lx = clamp(l.x, -w, w);
            floor = c.y + 0.45;
            head = c.head - 0.22;
        }
        const at = fromShip(s, lx, lz);
        x = at.x;
        z = at.z;
        trim(s);
        y = clamp(me.y + 1.62 - fy * dist, afloat(s, lx, floor, lz), afloat(s, lx, head, lz));
        unseen = Math.hypot(x - me.x, z - me.z) < IN_THE_WAY;
    } else y = Math.max(me.y + 1.75 - fy * dist, seaHeight(x, z, S.t) + 0.35, height(x, z) + 0.45);
    setCamera(x, y, z, PL.camYaw, PL.camPitch, 0, FOV);
    setListener(cam.x, cam.y, cam.z, cam.rx, cam.rz);
}

/** Reads the controls for a captain on foot, moves him, and places the camera behind him. */
export function updateCaptain(dt: number) {
    const me = PL.me,
        s = PL.ship;
    trim(s);
    layGangway();
    // the yard may have rebuilt her under him: a deck or a flight that is no longer there puts him back on her weather deck
    if (me.tier > s.hull.tweens.length || me.flight >= s.hull.flights.length) topside();
    // a deck carries whoever stands on it, and turns them with it
    if (me.on === ON.DECK) {
        const p = fromShip(s, me.lx, me.lz),
            turned = s.yaw - me.heading;
        me.x = p.x;
        me.z = p.z;
        me.yaw += turned;
        bound += turned;
        PL.camYaw += turned;
    }
    // ---- look ----
    PL.camYaw -= mouse.dx * opts.sens;
    PL.camPitch = clamp(PL.camPitch - mouse.dy * opts.sens, -1.2, 0.5);
    PL.dist = clamp(PL.dist + mouse.wheel * 0.1, 0.5, 2.4);
    mouse.dx = mouse.dy = mouse.wheel = 0;

    // ---- walk: the way the camera looks is forward ----
    const ahead = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0),
        across = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
        sn = Math.sin(PL.camYaw),
        c = Math.cos(PL.camYaw);
    let dx = -sn * ahead + c * across,
        dz = -c * ahead - sn * across;
    const going = Math.hypot(dx, dz),
        swimming = me.on === ON.SEA,
        // water to the waist is slow going, and so is a flight of steps
        pace = swimming ? SWIM : (running() ? RUN : WALK) * (me.on === ON.LAND && me.y < -0.3 ? 0.6 : 1) * (me.flight >= 0 ? ON_STEPS : 1);
    if (going > 0) {
        dx /= going;
        dz /= going;
        bound = Math.atan2(-dx, -dz);
    }
    // He gathers way and loses it, and comes round to it: nobody starts, stops or turns in an instant.
    // The springs also say how hard he is doing it, which is what he leans by (see drawCaptain).
    const half = me.air || swimming ? ADRIFT : going > 0 ? GATHER : CHECK;
    springTo(wayX, going > 0 ? dx * pace : 0, half, dt);
    springTo(wayZ, going > 0 ? dz * pace : 0, half, dt);
    const round = angDiff(me.yaw, bound);
    turning.x = -round;
    me.yaw += round + springTo(turning, 0, COME_ROUND, dt);
    me.speed = Math.hypot(wayX.x, wayZ.x);
    if (me.speed < 0.03 && going === 0) me.speed = wayX.x = wayZ.x = wayX.v = wayZ.v = 0;
    if (me.speed > 0) {
        const d = me.speed * dt;
        dx = me.mx = wayX.x / me.speed;
        dz = me.mz = wayZ.x / me.speed;
        // straight on if he can
        if (!step(me.x + dx * d, me.z + dz * d)) {
            let made = false;
            if (face.hit) {
                // against something built, he keeps whatever of his way runs along its face, and loses the
                // rest; a round thing met square on he goes round to one side
                const into = dx * face.x + dz * face.z;
                let sx = dx - into * face.x,
                    sz = dz - into * face.z;
                if (face.round && Math.hypot(sx, sz) < 0.3) {
                    sx = -face.z * 0.7;
                    sz = face.x * 0.7;
                } else if (!face.round && into < 0) {
                    wayX.x -= into * me.speed * face.x;
                    wayZ.x -= into * me.speed * face.z;
                }
                made = Math.hypot(sx, sz) > 0.05 && step(me.x + sx * d, me.z + sz * d);
            } else
                // against his own ship (a bulwark, a mast, her side) he takes the smallest turn that finds a footing
                for (const turn of SIDESTEPS) {
                    const ct = Math.cos(turn),
                        st = Math.sin(turn);
                    if ((made = step(me.x + (dx * ct - dz * st) * d * 0.8, me.z + (dx * st + dz * ct) * d * 0.8))) break;
                }
            // brought up short: his feet stop with him
            if (!made && me.speed > 0.5) {
                wayX.x *= 0.5 / me.speed;
                wayZ.x *= 0.5 / me.speed;
            }
            me.speed = Math.hypot(wayX.x, wayZ.x);
        }
    }
    // his stride keeps the pace he is making over the ground, so that a planted foot stays planted
    me.phase += swimming ? (1.2 + 3 * (me.speed / SWIM)) * dt : TAU * cadence(me.speed) * dt * Math.min(1, me.speed * 2);

    // ---- what is under him now: he follows it up, and falls to it down ----
    const g = ground(me.x, me.z, me.on, me.y);
    // walked off an edge: he is in the air as surely as if he had jumped
    if (!me.air && me.y > g.y + 0.3) me.air = true;
    if (me.air) {
        me.vy -= GRAVITY * dt;
        me.y += me.vy * dt;
        if (me.vy <= 0 && me.y <= g.y) {
            if (g.on === ON.SEA) {
                if (me.vy < -3) {
                    fxSplash(me.x, g.y + AFLOAT, me.z, 1.3);
                    sfx.splash(me.x, 0, me.z);
                }
            } else impact = -me.vy;
            me.y = g.y;
            me.vy = 0;
            me.air = false;
        }
    } else {
        me.vy = 0;
        // on her steps he is carried up and down them as fast as he walks them
        me.y = damp(me.y, g.y, g.on === ON.SEA ? 5 : me.flight >= 0 ? 45 : 18, dt);
    }
    me.on = g.on;
    if (me.on !== ON.DECK) topside();
    if (me.on === ON.DECK) {
        const l = toShip(s, me.x, me.z);
        me.lx = l.x;
        me.lz = l.z;
        me.heading = s.yaw;
    } else if (me.on !== ON.PLANK && !s.dead) {
        // in the water under her side (he has just gone over it, or she has swung onto him) he is shouldered clear of her planking
        const l = toShip(s, me.x, me.z);
        if (deckAt(s, l.z) && Math.abs(l.x) < deck.w * s.scale + PLANKING) {
            const out = fromShip(s, l.x + (l.x < 0 ? -1 : 1) * Math.min(3.5 * dt, deck.w * s.scale + PLANKING - Math.abs(l.x)), l.z);
            me.x = out.x;
            me.z = out.z;
        }
    }

    // ---- what E would do here ----
    ashore += dt;
    soaked = me.on === ON.SEA ? soaked + dt : 0;
    if (atWheel()) hud.tip('helm', 0.25);
    else if (me.on !== ON.DECK && me.on !== ON.PLANK && canClimb()) hud.tip('climb', 0.25);
    else if (adrift()) hud.tip('line', 0.25);
    else if (me.on !== ON.DECK && ashore > 1.5 && ashore < 30) hud.tip('board', 0.25);
    captainCamera();
}

const PLAIN = [1, 1, 1];

// the ground under a point against the ground under him, if it is ground a foot of his could be on; else NaN
function footing(x: number, z: number) {
    const me = PL.me,
        g = ground(x, z, me.on, me.y),
        rise = g.y - me.y;
    return g.on !== ON.SEA && Math.abs(rise) < FOOTING ? rise : NaN;
}

// whether a foot is where it means to be: planted, with nothing left to carry over
const firm = (s: Sole) => s.planted && Math.hypot(s.ox.x, s.oz.x) < 0.04;

/**
 * Keeps his feet on the ground, in the manner of the foot locking of Daniel Holden's Motion-Matching
 * demo (`contact_update`). A foot his pose calls planted is held where it first came down, in the
 * world (or on his ship's deck, which moves under him), however the rest of him turns and shifts;
 * left too far behind, or turned too far over, it is taken up and set down again where it now
 * belongs, one foot at a time, which is how he turns on the spot and settles when he pulls up.
 * Each foot is then set at the height of the ground actually under it, and to its slope. Rewrites
 * the feet of `p`, which is solved afterwards. `striding` is 0 standing, 1 in full stride.
 */
function tread(p: Pose, dt: number, grounded: boolean, striding: number) {
    const me = PL.me,
        s = PL.ship,
        aboard = me.on === ON.DECK,
        c = Math.cos(me.yaw),
        sn = Math.sin(me.yaw);
    for (let i = 0; i < 2; i++) {
        const right = i === 1,
            sole = soles[i],
            fx = (right ? p.xR : p.xL) * BUILD,
            fa = (right ? p.aheadR : p.aheadL) * BUILD,
            down = grounded && (right ? p.downR : p.downL) > 0.5,
            // where his pose would have it, and the way it would point
            tx = me.x + c * fx - sn * fa,
            tz = me.z - sn * fx - c * fa,
            tyaw = me.yaw + (right ? p.turnR : p.turnL);
        // and where it is planted, if it is
        let lx = tx,
            lz = tz,
            lyaw = tyaw;
        if (sole.planted) {
            if (sole.aboard) {
                const w = fromShip(s, sole.x, sole.z);
                lx = w.x;
                lz = w.z;
                lyaw = sole.yaw + s.yaw;
            } else {
                lx = sole.x;
                lz = sole.z;
                lyaw = sole.yaw;
            }
        }
        const stray = Math.hypot(lx - tx, lz - tz),
            askew = Math.abs(angDiff(tyaw, lyaw)),
            // lifted by his pose; or left behind, when his other foot is down to stand on (or it cannot wait for that)
            lift = !down || ((stray > lerp(STRAY, STRAY_STRIDING, striding) || askew > ASKEW) && (firm(soles[1 - i]) || stray > 0.5 || askew > 1));
        if (sole.planted && lift) {
            // let go: what that moves it by is carried, and dies away
            sole.ox.x += lx - tx;
            sole.oz.x += lz - tz;
            sole.turn.x += angDiff(tyaw, lyaw);
            sole.span = Math.hypot(sole.ox.x, sole.oz.x);
            sole.planted = false;
            lx = tx;
            lz = tz;
            lyaw = tyaw;
        }
        if (down && (!sole.planted || sole.aboard !== aboard)) {
            // set down, where it is: on the deck that is in her frame, so that she carries it with her
            sole.planted = true;
            sole.aboard = aboard;
            if (aboard) {
                const l = toShip(s, lx, lz);
                sole.x = l.x;
                sole.z = l.z;
                sole.yaw = lyaw - s.yaw;
            } else {
                sole.x = lx;
                sole.z = lz;
                sole.yaw = lyaw;
            }
        }
        springTo(sole.ox, 0, CATCH_UP, dt);
        springTo(sole.oz, 0, CATCH_UP, dt);
        springTo(sole.turn, 0, CATCH_UP, dt);
        const bx = lx + sole.ox.x,
            bz = lz + sole.oz.x,
            yaw = clamp(angDiff(me.yaw, lyaw) + sole.turn.x, -1.1, 1.1),
            y = right ? p.yR : p.yL;
        // the ground under it, and under its toes
        let rise = 0,
            slope = 0;
        if (grounded) {
            const here = footing(bx, bz),
                toe = footing(bx - Math.sin(me.yaw + yaw) * 0.2, bz - Math.cos(me.yaw + yaw) * 0.2);
            if (here === here) {
                rise = here;
                // a foot in the air is not laid to the slope it is passing over
                if (toe === toe) slope = Math.atan2(toe - here, 0.2) * (1 - smooth(RIG.ankle + 0.03, RIG.ankle + 0.2, y));
            }
        }
        springTo(sole.rise, rise, FIND, dt);
        springTo(sole.slope, slope, FIND, dt);
        // a foot that is moved any distance is stepped there, not slid
        const gone = sole.span > 0.06 ? clamp(1 - Math.hypot(sole.ox.x, sole.oz.x) / sole.span, 0, 1) : 0,
            hop = Math.min(0.09, 0.4 * sole.span) * Math.sin(Math.PI * gone),
            rx = bx - me.x,
            rz = bz - me.z,
            fy = y + (sole.rise.x + hop) / BUILD;
        sole.wx = bx;
        sole.wy = me.y + fy * BUILD;
        sole.wz = bz;
        if (right) {
            p.xR = (c * rx - sn * rz) / BUILD;
            p.aheadR = (-sn * rx - c * rz) / BUILD;
            p.yR = fy;
            p.toesR += sole.slope.x;
            p.turnR = yaw;
        } else {
            p.xL = (c * rx - sn * rz) / BUILD;
            p.aheadL = (-sn * rx - c * rz) / BUILD;
            p.yL = fy;
            p.toesL += sole.slope.x;
            p.turnL = yaw;
        }
    }
}

/**
 * Draws the captain wherever he is, in whatever he is doing: at the wheel while he has it, his hands
 * on its spokes; and his ship's gangway while it is down. `dt` moves him on; with none he holds still.
 */
export function drawCaptain(dt: number) {
    const me = PL.me,
        s = PL.ship,
        // in a crew each player wears a colour of their own; the host's, and a lone captain's, is his ship's
        coat = (NET.on && COATS[NET.me]) || s.paint,
        Sm = trim(s);
    layGangway();
    if (gang.on) {
        const a = gang.rail,
            b = gang.wharf,
            dx = b[0] - a[0],
            dy = b[1] - a[1],
            dz = b[2] - a[2];
        m4aim(Tm, a[0], a[1], a[2], dx, dy, dz, 0.9, Math.hypot(dx, dy, dz), 1);
        addInstance(M.gangway, Tm);
    }
    if (s.dead && !PL.afoot) return;

    // ---- the movement he is making, and the pose it asks for ----
    const now = !PL.afoot ? MOVE.HELM : PL.gun >= 0 ? MOVE.GUN : me.air ? MOVE.AIR : me.on === ON.SEA ? MOVE.SWIM : MOVE.GROUND,
        grounded = now === MOVE.GROUND,
        striding = grounded ? smooth(0.05, 0.9, me.speed) : 0;
    if (now === MOVE.HELM) helmPose(src, S.t, s.rudder);
    else if (now === MOVE.GUN) gunPose(src, S.t);
    else if (now === MOVE.SWIM) swimPose(src, me.phase, me.speed / SWIM);
    else if (now === MOVE.AIR) airPose(src, me.vy, lead, launch);
    else {
        standPose(src, S.t);
        if (striding > 0) mixPose(src, gaitPose(stride, me.phase, me.speed), striding);
    }
    if (now !== move) {
        // a new movement starts at once, and what he was doing runs on into it and dies away
        cutPose(carry, src);
        // coming down, his knees take up the speed he came down at
        if (grounded && move === MOVE.AIR) give.v -= Math.min(impact, 13) * IMPACT;
        move = now;
        impact = 0;
    }
    if (dt > 0) flowPose(carry, src, BLEND, dt);
    copyPose(pose, carry.out);

    // ---- his weight ----
    // He leans the way he is being pushed: forward to gather way and back to check it, and into a turn.
    const c = Math.cos(me.yaw),
        sn = Math.sin(me.yaw);
    springTo(pitch, grounded ? clamp((-sn * wayX.v - c * wayZ.v) * LEAN, -LEAN_MOST, LEAN_MOST) : 0, HEEL, dt);
    springTo(heel, grounded ? clamp((c * wayX.v - sn * wayZ.v) * LEAN, -LEAN_MOST, LEAN_MOST) : 0, HEEL, dt);
    springTo(give, 0, GIVE, dt);
    give.x = Math.max(give.x, -0.42);
    // the whole of him goes over from the feet, like a pole balanced on a hand, and his head stays level on top
    pose.lean += pitch.x * 0.6;
    pose.chestLean += pitch.x * 0.45;
    pose.lunge += pitch.x * 0.4;
    pose.headNod -= pitch.x * 0.7;
    pose.tilt -= heel.x * 0.6;
    pose.chestTilt -= heel.x * 0.45;
    pose.sway += heel.x * 0.35;
    // his shoulders lead him into a turn
    pose.chestTwist += clamp(turning.v * 0.022, -0.3, 0.3) * striding;
    // a landing: the hips sink onto bent knees, he folds forward over them, and his arms go out
    const sunk = -give.x;
    pose.lift -= sunk;
    pose.lean += sunk * 0.75;
    pose.chestLean += sunk * 0.6;
    pose.headNod -= sunk * 1.1;
    pose.armL += sunk * 0.7;
    pose.armR += sunk * 0.7;
    pose.spreadL += sunk * 1.1;
    pose.spreadR += sunk * 1.1;
    pose.elbowL += sunk * 1.6;
    pose.elbowR += sunk * 1.6;
    if (PL.afoot && now !== MOVE.SWIM && now !== MOVE.GUN) {
        // his head goes where the player is looking, as far as a neck turns, and his shoulders a little after it
        const look = angDiff(me.yaw, PL.camYaw),
            turn = Math.abs(look) < 2.2 ? clamp(look, -1.15, 1.15) : 0;
        pose.headTurn += turn * 0.7;
        pose.chestTwist += turn * 0.2;
        pose.headNod -= clamp(PL.camPitch + 0.2, -0.5, 0.5) * 0.5;
    }

    // ---- his feet, and the legs that reach them ----
    tread(pose, dt, grounded, striding);
    solvePose(pose, grounded || now === MOVE.HELM || now === MOVE.GUN);

    // ---- and where he is ----
    if (!PL.afoot) {
        const h = s.hull.helm;
        m4trs(Lm, 0, h[1], h[2] + ABAFT, 0, 0, 0, BUILD / s.scale);
        m4mul(Bm, Sm, Lm);
    } else if (now === MOVE.SWIM)
        // afloat, his hips ride just under the surface
        m4trs(Bm, me.x, me.y + AFLOAT - 0.28, me.z, me.yaw, 0, 0, BUILD);
    else m4trs(Bm, me.x, me.y, me.z, me.yaw, 0, 0, BUILD);
    if (!(unseen && PL.afoot && covered())) drawFigure(C, Bm, pose, coat, PLAIN);
}
