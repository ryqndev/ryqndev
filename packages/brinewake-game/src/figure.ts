// A person, as a rig: a pelvis, a chest and a head, each turning on the one below; two legs of
// thigh, shin and foot; two arms of upper arm and forearm. This module owns the skeleton's
// measurements, the poses that make it stand, walk, run, jump, swim and steer, and the drawing of
// it. Whoever uses it (the townsfolk, the captain) builds meshes to these measurements and says
// which pose, and gets the same movement.
//
// Every pose says where the feet are, not how the legs are bent: each foot is given a place, and
// each leg is solved, hip and knee, to reach it from wherever the pelvis has been put (solvePose).
// That is what lets whoever owns a figure move a foot after the pose is made: hold it where it
// was planted while the body turns over it, or set it down on the step it is actually over.
//
// The ideas are the ones large games use, taken from what their authors have published:
//  - a stride measured out by the ground covered, so that a planted foot is carried back at exactly
//    the speed the body goes forward (the "surveyor's wheel" of David Rosen's talk on Overgrowth's
//    animation; "distance matching" in Unreal);
//  - legs by inverse kinematics, and a pelvis that sinks until both feet can reach;
//  - a change of movement made by carrying the difference over and letting it die away, not by
//    cross-fading (inertialisation: David Bollo's from Gears of War, in the form Daniel Holden gives
//    in his MIT-licensed Motion-Matching demo, github.com/orangeduck/Motion-Matching).
import { addInstance, type Mesh } from '@ryqndev/brinewake-renderer';
import { clamp, lerp, m4, m4mul, m4trs, type Mat4, smooth, TAU } from '@ryqndev/kiln-math';

import { stiffness } from './spring';

/**
 * The skeleton, in metres, for a figure standing with its feet at the origin, facing -Z.
 * Meshes are built round their own joint at the origin: a pelvis round the hips, a chest standing
 * up from the waist, a head from the neck; a thigh, shin, upper arm and forearm hanging down -Y;
 * a foot round the ankle, its sole `ankle` below and its toe forward.
 */
export const RIG = {
    /** the hips: how far either side of the middle, and how high when standing straight */
    hipX: 0.095,
    hipY: 0.9,
    thigh: 0.43,
    shin: 0.4,
    /** the ankle above the sole, and how far ahead of it the ball of the foot is, and behind it the heel */
    ankle: 0.07,
    ball: 0.14,
    heel: 0.06,
    /** the waist above the hips, the neck above the waist, and the shoulders: above the waist, and out from the middle */
    spine: 0.12,
    neck: 0.5,
    shoulderY: 0.43,
    shoulderX: 0.235,
    upper: 0.28,
    fore: 0.3,
};

/** The meshes a figure is drawn with: each side uses the same limbs. */
export interface Parts {
    pelvis: Mesh;
    chest: Mesh;
    head: Mesh;
    thigh: Mesh;
    shin: Mesh;
    foot: Mesh;
    upper: Mesh;
    fore: Mesh;
}

/**
 * How a figure holds itself. Lengths in metres, angles in radians, in the figure's own frame: x to
 * its right, y up from the ground it stands on, "ahead" the way it faces. An upper arm swung
 * forward is positive, an elbow is given as how far it is bent, and a turn is positive to the
 * figure's left.
 */
export interface Pose {
    /** the pelvis, from where it is standing straight: to the figure's right, up, and forward */
    sway: number;
    lift: number;
    lunge: number;
    /** and turned, leant forward, and rolled */
    twist: number;
    lean: number;
    tilt: number;
    /** the chest on the pelvis, and the head on the chest */
    chestTwist: number;
    chestLean: number;
    chestTilt: number;
    headTurn: number;
    headNod: number;
    /** each arm: upper arm forward, out to its own side, and elbow bent */
    armL: number;
    armR: number;
    spreadL: number;
    spreadR: number;
    elbowL: number;
    elbowR: number;
    /**
     * Each foot. Where its ankle would be were the foot flat on the ground (x, ahead), and how high
     * the ankle is; how far the ankle has rolled forward of that as the heel lifts; how far the toes
     * are lifted, and which way they point; whether it is planted (1) or in the air (0); and how
     * much it is bearing: 1 while there is weight on it or about to be, so that the hips must come
     * down to it if the leg cannot reach, and 0 while it swings free and may fall short instead.
     */
    xL: number;
    yL: number;
    aheadL: number;
    rollL: number;
    toesL: number;
    turnL: number;
    downL: number;
    bearL: number;
    xR: number;
    yR: number;
    aheadR: number;
    rollR: number;
    toesR: number;
    turnR: number;
    downR: number;
    bearR: number;
    /** The legs that reach those feet, as solvePose leaves them: thigh forward and out, knee bent, the foot on the shin. */
    hipL: number;
    hipR: number;
    splayL: number;
    splayR: number;
    kneeL: number;
    kneeR: number;
    ankleL: number;
    ankleR: number;
    yawL: number;
    yawR: number;
}

export const newPose = (): Pose => ({
    sway: 0, lift: 0, lunge: 0, twist: 0, lean: 0, tilt: 0, chestTwist: 0, chestLean: 0, chestTilt: 0, headTurn: 0, headNod: 0,
    armL: 0, armR: 0, spreadL: 0.07, spreadR: 0.07, elbowL: 0.2, elbowR: 0.2,
    xL: -RIG.hipX, yL: RIG.ankle, aheadL: 0, rollL: 0, toesL: 0, turnL: 0, downL: 1, bearL: 1,
    xR: RIG.hipX, yR: RIG.ankle, aheadR: 0, rollR: 0, toesR: 0, turnR: 0, downR: 1, bearR: 1,
    hipL: 0, hipR: 0, splayL: 0, splayR: 0, kneeL: 0, kneeR: 0, ankleL: 0, ankleR: 0, yawL: 0, yawR: 0,
});

type Key = keyof Pose;
const ALL = Object.keys(newPose()) as Key[];
/** What of a pose is asked for, and so can be mixed and carried over; the rest is solved from it. */
const ASKED: Key[] = [
    'sway', 'lift', 'lunge', 'twist', 'lean', 'tilt', 'chestTwist', 'chestLean', 'chestTilt', 'headTurn', 'headNod',
    'armL', 'armR', 'spreadL', 'spreadR', 'elbowL', 'elbowR',
    'xL', 'yL', 'aheadL', 'rollL', 'toesL', 'turnL', 'bearL', 'xR', 'yR', 'aheadR', 'rollR', 'toesR', 'turnR', 'bearR',
];

export function copyPose(p: Pose, from: Pose) {
    for (const key of ALL) p[key] = from[key];
    return p;
}

/** Moves what a pose asks for a fraction `k` of the way to another's. Solve it afterwards. */
export function mixPose(p: Pose, to: Pose, k: number) {
    for (const key of ASKED) p[key] += (to[key] - p[key]) * k;
    p.downL += (to.downL - p.downL) * k;
    p.downR += (to.downR - p.downR) * k;
    return p;
}

// ---- one movement into the next ----

/**
 * What carries a figure from one movement into another. When the movement changes (cutPose) the
 * difference between where the figure was and where the new movement would have it, and how fast
 * it was moving, is kept; from then on (flowPose) the new movement is followed exactly, plus that
 * difference as it dies away. Nothing is cross-faded, so the new movement starts at once and the
 * old one's momentum is not lost.
 */
export interface Carry {
    off: Pose;
    vel: Pose;
    /** the pose as it went out last, and how fast each part of it was changing */
    out: Pose;
    rate: Pose;
    fresh: boolean;
}

const still = () => {
    const p = newPose();
    for (const key of ALL) p[key] = 0;
    return p;
};

export const newCarry = (): Carry => ({ off: still(), vel: still(), out: newPose(), rate: still(), fresh: true });

/** The fastest any part of a pose is taken to be changing, per second: one bad frame should not fling a limb. */
const RATE = 14;

/** Call when the movement `src` comes from has changed, before the flowPose of the same frame. */
export function cutPose(n: Carry, src: Pose) {
    if (n.fresh) return;
    for (const key of ASKED) {
        n.off[key] = n.out[key] - src[key];
        n.vel[key] = n.rate[key];
    }
}

/** Follows `src`, plus whatever is still carried over from before, which halves every `halflife` seconds. Returns the pose to use. */
export function flowPose(n: Carry, src: Pose, halflife: number, dt: number) {
    if (n.fresh) {
        copyPose(n.out, src);
        n.fresh = false;
        return n.out;
    }
    const y = stiffness(halflife),
        e = Math.exp(-y * dt);
    for (const key of ASKED) {
        const j1 = n.vel[key] + n.off[key] * y;
        n.off[key] = e * (n.off[key] + j1 * dt);
        n.vel[key] = e * (n.vel[key] - j1 * y * dt);
        const o = src[key] + n.off[key];
        n.rate[key] = clamp((o - n.out[key]) / dt, -RATE, RATE);
        n.out[key] = o;
    }
    n.out.downL = src.downL;
    n.out.downR = src.downR;
    return n.out;
}

// ---- feet and legs ----

// puts a foot where a pose wants it
function place(p: Pose, side: number, x: number, y: number, ahead: number, toes: number, turn: number, down: number, roll = 0, bear = down) {
    if (side < 0) {
        p.xL = x;
        p.yL = y;
        p.aheadL = ahead;
        p.rollL = roll;
        p.toesL = toes;
        p.turnL = turn;
        p.downL = down;
        p.bearL = bear;
    } else {
        p.xR = x;
        p.yR = y;
        p.aheadR = ahead;
        p.rollR = roll;
        p.toesR = toes;
        p.turnR = turn;
        p.downR = down;
        p.bearR = bear;
    }
}

const Qm = m4();
const pelvis = (p: Pose) => m4trs(Qm, p.sway, RIG.hipY + p.lift, -p.lunge, p.twist, -p.lean, p.tilt);

/**
 * Puts a foot where a leg held as given would leave it: for the movements that are easier said as
 * a thigh swung forward (`hip`) and out to its own side (`splay`), a knee bent, and a foot turned
 * on its shin (`ankle`). Call after the pelvis is posed.
 */
function reach(p: Pose, side: number, hip: number, splay: number, knee: number, ankle: number) {
    const Q = pelvis(p),
        U = RIG.thigh + RIG.shin * Math.cos(knee),
        V = RIG.shin * Math.sin(knee),
        roll = side * splay,
        y0 = -U * Math.cos(roll),
        ch = Math.cos(hip),
        sh = Math.sin(hip),
        // the ankle from the pelvis, in the pelvis's own frame
        lx = side * RIG.hipX + U * Math.sin(roll),
        ly = y0 * ch - V * sh,
        lz = y0 * sh + V * ch;
    place(p, side, Q[12] + Q[0] * lx + Q[4] * ly + Q[8] * lz, Q[13] + Q[1] * lx + Q[5] * ly + Q[9] * lz, -(Q[14] + Q[2] * lx + Q[6] * ly + Q[10] * lz), ankle + hip - knee - p.lean, 0, 0);
}

/** The longest a leg is drawn out to: never quite straight, which would snap the knee as it got there. */
const LEG = RIG.thigh + RIG.shin - 0.004;

// How far the pelvis has to come down for a leg to reach its foot.
function short(Q: Mat4, side: number, x: number, y: number, ahead: number) {
    const hx = Q[12] + Q[0] * side * RIG.hipX - x,
        hy = Q[13] + Q[1] * side * RIG.hipX - y,
        hz = Q[14] + Q[2] * side * RIG.hipX + ahead,
        flat = hx * hx + hz * hz;
    return flat < LEG * LEG ? hy - Math.sqrt(LEG * LEG - flat) : 0.3;
}

// One leg, bent at hip and knee to put its ankle on its foot: exact, for a thigh that swings forward and out and a knee that only bends back.
function leg(p: Pose, Q: Mat4, side: number, x: number, y: number, ahead: number, toes: number, turn: number) {
    // the ankle, seen from the hip, in the pelvis's frame
    const wx = x - Q[12],
        wy = y - Q[13],
        wz = -ahead - Q[14];
    let dx = Q[0] * wx + Q[1] * wy + Q[2] * wz - side * RIG.hipX,
        dy = Q[4] * wx + Q[5] * wy + Q[6] * wz,
        dz = Q[8] * wx + Q[9] * wy + Q[10] * wz;
    const a = RIG.thigh,
        b = RIG.shin,
        far = Math.hypot(dx, dy, dz) || 1,
        // as far as the leg will go, and no nearer than a deep crouch
        d = clamp(far, 0.32, LEG);
    dx *= d / far;
    dy *= d / far;
    dz *= d / far;
    const knee = Math.PI - Math.acos(clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1)),
        // the bent leg hanging from the hip: how far down it goes and how far back the knee throws the ankle
        U = a + b * Math.cos(knee),
        V = b * Math.sin(knee),
        roll = Math.asin(clamp(dx / U, -0.95, 0.95));
    let hip = Math.atan2(dz, dy) - Math.atan2(V, -U * Math.cos(roll));
    if (hip < -Math.PI) hip += TAU;
    else if (hip > Math.PI) hip -= TAU;
    // the shin's own slope is taken out of the foot's, so that it lies as asked on the ground
    const ankle = toes - (hip - knee) + p.lean,
        yaw = turn - p.twist;
    if (side < 0) {
        p.hipL = hip;
        p.kneeL = knee;
        p.splayL = side * roll;
        p.ankleL = ankle;
        p.yawL = yaw;
    } else {
        p.hipR = hip;
        p.kneeR = knee;
        p.splayR = side * roll;
        p.ankleR = ankle;
        p.yawR = yaw;
    }
}

/**
 * Bends the legs to reach the feet a pose asks for. A figure with its feet on the ground
 * (`grounded`) first sinks at the hips as far as it must for both to reach, as anyone does who
 * takes a long stride or stands across a step.
 */
export function solvePose(p: Pose, grounded = true) {
    let Q = pelvis(p);
    if (grounded) {
        const drop = Math.max(p.bearL * short(Q, -1, p.xL, p.yL, p.aheadL + p.rollL), p.bearR * short(Q, 1, p.xR, p.yR, p.aheadR + p.rollR));
        if (drop > 0) {
            p.lift -= Math.min(drop, 0.3);
            Q = pelvis(p);
        }
    }
    leg(p, Q, -1, p.xL, p.yL, p.aheadL + p.rollL, p.toesL, p.turnL);
    leg(p, Q, 1, p.xR, p.yR, p.aheadR + p.rollR, p.toesR, p.turnR);
    return p;
}

// ---- the poses ----

/** How far out a foot at rest is turned. */
const TOE_OUT = 0.16;

/**
 * Standing: breathing, the weight shifting from one foot to the other, an idle glance about. `t` is
 * the time and `seed` tells one figure from the next, so that a crowd does not breathe in step.
 * `apart` is how wide the feet are set, against the width of the hips.
 */
export function standPose(p: Pose, t: number, seed = 0, apart = 0.9) {
    const breath = Math.sin(t * 1.7 + seed),
        shift = Math.sin(t * 0.43 + seed * 2);
    p.sway = 0.022 * shift;
    p.lift = -0.012 - 0.004 * Math.abs(shift);
    p.lunge = 0;
    p.twist = 0.03 * shift;
    p.lean = 0.01;
    p.tilt = 0.025 * shift;
    p.chestTwist = -0.03 * shift;
    p.chestLean = 0.012 * breath;
    p.chestTilt = -0.03 * shift;
    p.headTurn = 0.22 * Math.sin(t * 0.31 + seed * 3) * Math.max(0, Math.sin(t * 0.11 + seed));
    p.headNod = 0.02 * breath;
    for (const side of [-1, 1]) place(p, side, side * RIG.hipX * apart, RIG.ankle, -0.015 * side, 0, -side * TOE_OUT, 1);
    p.armL = 0.03 + 0.03 * breath;
    p.armR = 0.03 - 0.03 * breath;
    p.spreadL = p.spreadR = 0.07;
    p.elbowL = p.elbowR = 0.2 + 0.03 * breath;
    return p;
}

/** Full strides (a step of each foot) a second at a speed over the ground: a stroll is slow, a sprint quick. */
export const cadence = (v: number) => 0.8 + 0.14 * v;

// Where one foot is, `f` of the way through a stride that began as it struck the ground: see the feet of Pose.
const at = { ahead: 0, roll: 0, up: 0, toes: 0, down: 0, bear: 0 };
function footfall(f: number, travel: number, duty: number, v: number, run: number) {
    // a walker's foot is planted as far ahead of him as it is left behind; a runner's lands nearer under him and is left further back
    const set = -0.03 - 0.07 * run - 0.008 * Math.max(0, v - 3.3),
        // how far it peels up onto its toes before it leaves the ground, and how far the toes are cocked as the heel comes down:
        // a walker lands on his heel, a runner nearer the flat of his foot
        peel = lerp(0.6, 1, run),
        cock = 0.34 * Math.min(1, v / 1.4) * (1 - 0.75 * run),
        // the ankle when the foot is peeled right up onto its ball
        peeledX = RIG.ball * (1 - Math.cos(peel)) + RIG.ankle * Math.sin(peel),
        peeledY = RIG.ball * Math.sin(peel) + RIG.ankle * Math.cos(peel);
    if (f < duty) {
        // planted: the ground carries it back under the body at exactly the speed the body moves, while
        // it rolls from its heel onto its sole, and at the last onto its ball
        const s = f / duty,
            on = cock * smooth(0.25, 0, s),
            off = peel * smooth(0.55, 1, s);
        at.ahead = set + travel * (0.5 - s);
        at.roll = RIG.ball * (1 - Math.cos(off)) + RIG.ankle * Math.sin(off);
        at.up = off > 0 ? RIG.ball * Math.sin(off) + RIG.ankle * Math.cos(off) : RIG.ankle + RIG.heel * Math.sin(on);
        at.toes = on - off;
        at.down = at.bear = 1;
    } else {
        // carried forward. It leaves the ground still going back with it, and comes to it already drawn
        // back toward the speed the ground is passing at, so that it neither snatches off nor stabs down
        const u = (f - duty) / (1 - duty),
            e = u * u * (3 - 2 * u),
            whip = -travel * 0.8 * Math.min(1.1, (1 - duty) / duty);
        at.ahead = set + travel * (e - 0.5) + whip * u * (1 - u) * (1 - 2 * u);
        at.roll = peeledX * (1 - smooth(0, 0.5, u));
        // up quickly behind (high, at a run) and down slowly in front
        at.up = lerp(peeledY, RIG.ankle + RIG.heel * Math.sin(cock), u) + (0.03 + 0.055 * v) * Math.sin(Math.PI * Math.pow(u, 0.7));
        at.toes = lerp(-peel, cock, smooth(0.3, 0.92, u));
        at.down = 0;
        // free once it is clear of the ground, and reaching for it again as it comes down
        at.bear = Math.max(smooth(0.18, 0, u), smooth(0.6, 1, u));
    }
    return at;
}

/**
 * A stride at `v` metres a second, `phase` radians into it (advance it by cadence(v) strides a
 * second, and the feet cover exactly the ground the figure does). Under about two metres a second
 * it is a walk: always a foot on the ground, the hips rising over each planted foot. Over that it
 * is a run: a moment in the air between steps, the hips sinking onto each foot, the elbows cocked.
 * The hips turn with the stride and drop on the side of the leg in the air, the shoulders turn
 * against them, and the head stays level.
 */
export function gaitPose(p: Pose, phase: number, v: number) {
    const f = phase / TAU - Math.floor(phase / TAU),
        run = smooth(1.9, 2.7, v),
        sprint = smooth(4.2, 6.4, v),
        // how much of a stride each foot spends on the ground, and how far it is carried back while it is there
        duty = lerp(clamp(0.66 - 0.04 * v, 0.56, 0.66), clamp(0.45 - 0.032 * v, 0.24, 0.4), run),
        travel = (duty * v) / cadence(v),
        // +1 with the left foot under the body, -1 with the right; and +1 with either
        mid = f - duty / 2,
        beat = Math.cos(TAU * mid),
        twice = Math.cos(2 * TAU * mid),
        wind = Math.cos(TAU * f),
        turn = Math.min(0.22, 0.05 + 0.03 * v),
        stoop = 0.02 + 0.038 * v + 0.05 * sprint;
    p.sway = -lerp(0.026, 0.008, run) * beat;
    p.lift = lerp(-0.03 + 0.02 * twice, -0.02 - (0.032 - 0.008 * sprint) * twice, run);
    p.lunge = 0;
    p.twist = -turn * wind;
    p.lean = stoop * 0.4;
    p.tilt = -lerp(0.035, 0.05, run) * beat;
    p.chestTwist = 1.7 * turn * wind;
    p.chestLean = stoop * 0.6;
    p.chestTilt = lerp(0.045, 0.062, run) * beat;
    p.headTurn = -0.7 * turn * wind;
    p.headNod = -stoop * 0.7;
    for (const side of [-1, 1]) {
        const foot = footfall(side < 0 ? f : (f + 0.5) % 1, travel, duty, v, run);
        // the faster the pace, the nearer one line the feet fall on, and the straighter they point
        place(p, side, side * RIG.hipX * (0.8 - 0.45 * run), foot.up, foot.ahead, foot.toes, -side * TOE_OUT * 0.5 * (1 - run), foot.down, foot.roll, foot.bear);
    }
    // an arm is furthest forward as the foot of the other side strikes; the elbow closes as it comes forward and opens behind
    const swing = Math.cos(TAU * f - 0.3),
        sweep = Math.min(1.1, 0.2 + 0.13 * v),
        bent = lerp(0.28, 1.35, run),
        // a runner's arm goes further back than forward, the hand passing the hip
        back = 0.28 * run;
    p.armR = sweep * swing - back;
    p.armL = -sweep * swing - back;
    p.elbowR = bent + 0.35 * Math.max(0, swing) - 0.5 * run * Math.max(0, -swing);
    p.elbowL = bent + 0.35 * Math.max(0, -swing) - 0.5 * run * Math.max(0, swing);
    p.spreadL = p.spreadR = 0.07 + 0.07 * run;
    return p;
}

/** Which leg is forward `phase` radians into a stride: -1 the left, 1 the right. A jump leads with it. */
export const leading = (phase: number) => (phase / TAU - Math.floor(phase / TAU) < 0.5 ? 1 : -1);

/**
 * Off the ground, as three attitudes mixed by how fast he is rising (`vy`, m/s), which is how a jump
 * is made to follow any arc: driving up off one leg, its knee high and the other trailing; gathered
 * at the top; and reaching down for the ground, arms out for balance, as it comes up to meet him.
 * `lead` is the leg whose knee is up (-1 the left, 1 the right), and `drive` how much of a running
 * jump it is: 0 jumps off both feet where he stands, 1 off one at full stride.
 */
export function airPose(p: Pose, vy: number, lead = -1, drive = 1) {
    const up = clamp(vy / 5, 0, 1),
        down = clamp(-vy / 6, 0, 1),
        top = 1 - up - down,
        mix = (a: number, b: number, c: number) => a * up + b * top + c * down,
        // the leading leg and the trailing one; a standing jump tucks both alike
        hipA = mix(1.15, 0.9, 0.4),
        kneeA = mix(1.5, 1.3, 0.55),
        hipB = lerp(hipA, mix(-0.4, 0.2, 0.12), drive),
        kneeB = lerp(kneeA, mix(0.35, 0.95, 0.4), drive),
        splay = mix(0.05, 0.1, 0.14),
        // feet pointed going up, and brought level to land on
        ankle = mix(-0.6, -0.4, -0.1),
        // the arm opposite the leading knee is thrown forward with it
        fore = mix(1.25, 0.5, 0.35),
        aft = lerp(fore, mix(-0.55, 0.1, 0.35), drive);
    p.sway = p.lift = p.lunge = p.twist = p.tilt = 0;
    p.lean = mix(0.14, 0.06, -0.04);
    p.chestTwist = -0.14 * lead * drive * (up + top);
    p.chestLean = mix(0.1, 0.04, 0);
    p.chestTilt = 0;
    p.headTurn = 0;
    p.headNod = mix(-0.15, 0, 0.12);
    reach(p, lead, hipA, splay, kneeA, ankle);
    reach(p, -lead, hipB, splay, kneeB, ankle);
    p.armL = lead < 0 ? aft : fore;
    p.armR = lead < 0 ? fore : aft;
    p.elbowL = p.elbowR = mix(1.1, 0.7, 0.45);
    p.spreadL = p.spreadR = mix(0.15, 0.4, 0.85);
    return p;
}

/**
 * Swimming on the breast: the body lies along the water with the head held up out of it; the arms
 * reach forward together, sweep out and back, and fold in to reach again, while the legs draw up
 * and kick. Draw it with the figure's origin at the height its hips should be.
 */
export function swimPose(p: Pose, phase: number, moving: number) {
    const s = Math.sin(phase),
        c = Math.cos(phase),
        pull = 0.5 + 0.5 * s,
        // treading water between strokes: smaller, and never still
        k = 0.35 + 0.65 * moving,
        level = 1.02 + 0.2 * moving;
    p.sway = p.lunge = p.twist = 0;
    p.lift = -RIG.hipY + 0.03 * Math.sin(phase * 2);
    p.lean = level;
    p.tilt = 0.05 * s;
    p.chestTwist = p.chestTilt = p.headTurn = 0;
    p.chestLean = -0.2;
    p.headNod = -(level - 0.35);
    p.armL = p.armR = 2.6 - 1.4 * pull * k;
    p.elbowL = p.elbowR = 0.15 + 1.2 * Math.max(0, c) * k;
    p.spreadL = p.spreadR = 0.15 + 0.85 * pull * k;
    for (const side of [-1, 1]) reach(p, side, 0.15 + 0.5 * Math.max(0, -c) * k, 0.08 + 0.3 * Math.max(0, -s) * k, 0.2 + 1.15 * Math.max(0, -c) * k, -0.9);
    return p;
}

/** At a ship's wheel: feet braced apart, a hand on a spoke either side, one drawing down as the other goes up with the helm (`rudder`, -1 .. 1). */
export function helmPose(p: Pose, t: number, rudder: number) {
    standPose(p, t, 0, 1.7);
    p.twist = p.chestTwist = 0;
    p.chestTilt = -rudder * 0.07;
    p.chestLean = 0.07;
    p.headTurn = 0;
    p.armL = 1.05 + rudder * 0.35;
    p.armR = 1.05 - rudder * 0.35;
    p.elbowL = 0.55 - rudder * 0.3;
    p.elbowR = 0.55 + rudder * 0.3;
    p.spreadL = p.spreadR = 0.02;
    return p;
}

/** Serving a gun: feet braced behind her breech and knees a little bent, leaning in over her to lay her, a hand either side. */
export function gunPose(p: Pose, t: number) {
    standPose(p, t, 0, 1.5);
    p.twist = p.chestTwist = p.headTurn = 0;
    p.lift = -0.1;
    p.lean = 0.14;
    p.chestLean = 0.2;
    p.headNod = -0.3;
    p.armL = p.armR = 0.95;
    p.elbowL = p.elbowR = 0.5;
    p.spreadL = p.spreadR = 0.05;
    return p;
}

// ---- drawing ----

const Lm = m4(),
    Pm = m4(),
    Cm = m4(),
    Um = m4(),
    Tm = m4();

// one leg, from its hip on the pelvis: thigh, shin and foot
function drawLeg(l: Parts, side: number, hip: number, splay: number, knee: number, ankle: number, yaw: number, c: number[]) {
    m4trs(Lm, side * RIG.hipX, 0, 0, 0, hip, side * splay);
    m4mul(Um, Pm, Lm);
    addInstance(l.thigh, Um, c[0], c[1], c[2]);
    m4trs(Lm, 0, -RIG.thigh, 0, 0, -knee, 0);
    m4mul(Tm, Um, Lm);
    addInstance(l.shin, Tm, c[0], c[1], c[2]);
    m4trs(Lm, 0, -RIG.shin, 0, yaw, ankle, 0);
    m4mul(Um, Tm, Lm);
    addInstance(l.foot, Um, c[0], c[1], c[2]);
}

// one arm, from its shoulder on the chest: upper arm and forearm
function drawArm(l: Parts, side: number, swing: number, spread: number, elbow: number, c: number[]) {
    m4trs(Lm, side * RIG.shoulderX, RIG.shoulderY, 0, 0, swing, side * spread);
    m4mul(Um, Cm, Lm);
    addInstance(l.upper, Um, c[0], c[1], c[2]);
    m4trs(Lm, 0, -RIG.upper, 0, 0, elbow, 0);
    m4mul(Tm, Um, Lm);
    addInstance(l.fore, Tm, c[0], c[1], c[2]);
}

/**
 * Draws a figure in a solved pose (see solvePose). `root` puts its feet on the ground and faces it;
 * `coat` tints the painted parts of its body and arms, and `hose` its legs. Leave the legs out
 * (`legs` false) for someone in a skirt to the ground.
 */
export function drawFigure(l: Parts, root: Mat4, p: Pose, coat: number[], hose: number[], legs = true) {
    m4trs(Lm, p.sway, RIG.hipY + p.lift, -p.lunge, p.twist, -p.lean, p.tilt);
    m4mul(Pm, root, Lm);
    addInstance(l.pelvis, Pm, coat[0], coat[1], coat[2]);
    if (legs) {
        drawLeg(l, -1, p.hipL, p.splayL, p.kneeL, p.ankleL, p.yawL, hose);
        drawLeg(l, 1, p.hipR, p.splayR, p.kneeR, p.ankleR, p.yawR, hose);
    }
    m4trs(Lm, 0, RIG.spine, 0, p.chestTwist, -p.chestLean, p.chestTilt);
    m4mul(Cm, Pm, Lm);
    addInstance(l.chest, Cm, coat[0], coat[1], coat[2]);
    drawArm(l, -1, p.armL, p.spreadL, p.elbowL, coat);
    drawArm(l, 1, p.armR, p.spreadR, p.elbowR, coat);
    m4trs(Lm, 0, RIG.neck, 0, p.headTurn, -p.headNod, 0);
    m4mul(Tm, Cm, Lm);
    addInstance(l.head, Tm, coat[0], coat[1], coat[2]);
}
