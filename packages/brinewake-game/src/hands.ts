// The hired company, aboard. Every sailor with a station (ships/crew.ts) is a figure on the deck of
// the player's ship, doing what a player in a crew would do there: the helmsman takes the wheel
// whenever no player has it, and stands by it when one does; each gun captain stands to a gun of
// his battery that no player is serving, and trains it on whatever the battery is laid on; the
// sailing master goes from mast to mast, the carpenter about the deck to wherever she is hurt, and
// the purser keeps her books at the table in her cabin, going in and out by its door like anyone else.
//
// They stand on whatever a player would stand on there: her open deck, the decks raised over it,
// and in her cabin its own floor (see deckAt in deck.ts).
//
// What they do to the ship's figures is unchanged, and is still the business of fittings.ts and
// ships/gunners.ts: this is those same hands made visible. Nothing here is sent between the
// browsers of a crew. Each one works out the same company from the same career and the same clock,
// so everyone sees a hand at the same station, if not on the same plank.
import { angDiff, clamp, damp, m4, m4mul, m4trs, smooth, TAU } from '@ryqndev/kiln-math';

import { ABAFT } from './afoot';
import { afloat, deck, deckAt, fromShip, toShip, trim } from './deck';
import { cadence, drawFigure, gaitPose, gunPose, helmPose, mixPose, newPose, type Pose, solvePose, standPose } from './figure';
import { gunSpot, servable } from './gunner';
import { gunManned, helmed } from './posts';
import { type Ship, TRAIN } from './ships';
import { aboard, type Sailor, type Station } from './ships/crew';
import { berthsOf } from './ships/fittings';
import { PL, S } from './state';
import { townsman } from './town';

/** Metres a second a hand goes about the deck at, and at a run when there is far to go. */
const WALK = 1.7,
    RUN = 3.4;
/** How near where they are going counts as there, metres. */
const THERE = 0.2;
/** How much room a mast or the wheel is given by someone walking past it, and how far inside her bulwarks they keep, metres. */
const BERTH = 0.6,
    INBOARD = 0.3;
/** How long each of the hands who goes about the deck stays in one place, seconds. */
const LINGER: Partial<Record<Station, number>> = { sails: 9, carpenter: 6, purser: 15 };

/** What a hand is doing: on their feet, at the wheel, or standing to a gun. */
const DOING = { AFOOT: 0, HELM: 1, GUN: 2 } as const;

/** Slops: what the hands wear, by turn. */
const SLOPS = [
    [0.74, 0.66, 0.5],
    [0.3, 0.42, 0.62],
    [0.56, 0.24, 0.18],
    [0.32, 0.46, 0.3],
    [0.86, 0.82, 0.72],
    [0.42, 0.3, 0.5],
];
const WHITE = [1, 1, 1];

interface Hand {
    id: number;
    post: Station;
    /** where on her deck they are, in her own frame; the height of the planking under them, in her hull's metres; and the way they face, against her heading */
    lx: number;
    lz: number;
    y: number;
    yaw: number;
    speed: number;
    phase: number;
    seed: number;
    /** which of DOING, once they are where it is done */
    doing: number;
    /** in her cabin, on its floor; and half way through its door, bound in or out */
    below: boolean;
    thru: boolean;
    /** a gun captain's flinch as his battery goes off, dying away */
    kick: number;
    pose: Pose;
}

const hands: Hand[] = [];
const Bm = m4(),
    Lm = m4();
const stride = newPose();
// where a hand is bound, what for, and whether it is in her cabin
const goal = { x: 0, z: 0, doing: 0 as number, gun: 0, below: false };
/** How far before her cabin's door, and how far inside it, someone going through it makes for, metres. */
const BEFORE = 0.6,
    WITHIN = 0.5;

// a number from 0 to 1 that every browser of a crew gets alike, for sailor `id`'s `n`th choice of the `k`th spell
const chance = (id: number, k: number, n: number) => {
    const v = Math.sin(id * 78.233 + k * 12.9898 + n * 37.719) * 43758.5453;
    return v - Math.floor(v);
};

// Where a hand's duty takes them just now. Leaves it in `goal`.
function duty(h: Hand, s: Ship) {
    const hull = s.hull,
        k = s.scale,
        // which spell of going about the deck this is: it changes every LINGER seconds, for each hand at a different moment
        spell = Math.floor((S.t + h.seed) / (LINGER[h.post] ?? 10));
    goal.doing = DOING.AFOOT;
    goal.below = false;
    switch (h.post) {
        case 'helm':
            // the wheel is his while no player wants it; while one has it he stands at their shoulder
            goal.z = (hull.helm[2] + ABAFT) * k;
            if (helmed()) {
                goal.x = 1.25;
                goal.z += 0.5;
            } else {
                goal.x = 0;
                goal.doing = DOING.HELM;
            }
            break;
        case 'port':
        case 'starboard': {
            // the gun nearest the middle of his battery that no player is serving
            const side = h.post === 'port' ? 0 : 1,
                n = hull.posts[side];
            let best = -1;
            for (let i = 0; i < n; i++) if (servable(s, side, i) && !gunManned(side, i) && (best < 0 || Math.abs(i - (n - 1) / 2) < Math.abs(best - (n - 1) / 2))) best = i;
            if (best < 0) {
                // every gun of it has a player at it: he stands back amidships and lets them fight it
                goal.x = side ? 0.5 : -0.5;
                goal.z = 0.2 * s.hl;
                break;
            }
            const p = gunSpot(s, side, best);
            goal.x = p.lx;
            goal.z = p.lz;
            goal.doing = DOING.GUN;
            goal.gun = best;
            break;
        }
        case 'sails': {
            // from the foot of one mast to the foot of another, looking aloft
            const masts = hull.masts,
                mz = masts[Math.floor(chance(h.id, spell, 0) * masts.length) % masts.length];
            goal.x = chance(h.id, spell, 1) < 0.5 ? -1 : 1;
            goal.z = mz * k + 0.5;
            break;
        }
        case 'carpenter':
            // anywhere along her, sounding her timbers
            goal.z = (chance(h.id, spell, 0) * 1.4 - 0.7) * s.hl;
            deckAt(s, goal.z, true);
            goal.x = (chance(h.id, spell, 1) * 2 - 1) * Math.max(0, deck.w * k - 0.7);
            break;
        default:
            if (hull.cabin) {
                // the purser is at the cabin table over her books, and now and then up for a turn about the deck
                if (chance(h.id, spell, 2) < 0.8) {
                    goal.x = hull.cabin.desk[0] * k;
                    goal.z = hull.cabin.desk[2] * k;
                    goal.below = true;
                    break;
                }
                goal.x = chance(h.id, spell, 0) < 0.5 ? -1.2 : 1.2;
                goal.z = (hull.cabin.z0 - 1.5 - 2 * chance(h.id, spell, 1)) * k;
                break;
            }
            // with no cabin to keep them in, he keeps aft with an eye on the hatch
            goal.x = chance(h.id, spell, 0) < 0.5 ? -1.4 : 1.4;
            goal.z = (hull.helm[2] - 1.6 - 1.8 * chance(h.id, spell, 1)) * k;
    }
}

// Sends a hand whose duty is on the other side of her cabin's door round by it: to stand before it
// (or behind it), then through. Changes `goal` to the next place on that way, and takes the hand
// from her deck to the cabin's floor, or back, as they cross its sill.
function byTheDoor(h: Hand, s: Ship) {
    const c = s.hull.cabin;
    if (!c) h.below = false;
    if (!c || h.below === goal.below) {
        h.thru = false;
        return;
    }
    const sill = c.z0 * s.scale,
        near = h.below ? sill + WITHIN : sill - BEFORE,
        far = h.below ? sill - BEFORE : sill + WITHIN;
    if (!h.thru && Math.hypot(h.lx, h.lz - near) < THERE) h.thru = true;
    goal.x = 0;
    goal.z = h.thru ? far : near;
    goal.doing = DOING.AFOOT;
    if (h.thru && h.lz >= sill !== h.below) {
        h.below = !h.below;
        h.thru = false;
    }
}

// one pace toward a point of her deck: round her masts and her wheel, and inside her bulwarks
function pace(h: Hand, s: Ship, dt: number) {
    const dx = goal.x - h.lx,
        dz = goal.z - h.lz,
        d = Math.hypot(dx, dz);
    h.speed = damp(h.speed, d < THERE ? 0 : d > 7 ? RUN : WALK, 6, dt);
    if (d < 0.02 || dt <= 0) return d;
    const go = Math.min(d, h.speed * dt);
    let x = h.lx + (dx / d) * go,
        z = h.lz + (dz / d) * go;
    const hull = s.hull,
        wheel = (hull.helm[2] - 0.2) * s.scale;
    for (let i = 0; i <= hull.masts.length; i++) {
        const oz = i < hull.masts.length ? hull.masts[i] * s.scale : wheel,
            ox = x,
            off = z - oz,
            r = Math.hypot(ox, off);
        if (r >= BERTH) continue;
        // shouldered out to arm's length from it, and on round it the way he was already going, or his own way if he met it square
        const way = Math.abs(ox) > 0.05 ? Math.sign(ox) : h.seed % 2 < 1 ? 1 : -1,
            nx = r > 0.01 ? ox / r : way,
            nz = r > 0.01 ? off / r : 0;
        x = nx * BERTH + way * go * 0.7;
        z = oz + nz * BERTH;
    }
    // and round whatever else stands on her decks, and the hatches in them: nothing of that is in her cabin
    if (!h.below)
        for (const list of [hull.walk.stands, hull.walk.pits])
            for (const o of list) {
                const ox = x - o[0] * s.scale,
                    off = z - o[1] * s.scale,
                    clear = (o[2] + 0.32) * s.scale,
                    r = Math.hypot(ox, off);
                // what stands on another deck than his is not in his way
                if (r >= clear || (o.length > 3 && Math.abs(o[3] - h.y) > 0.9)) continue;
                const way = Math.abs(ox) > 0.05 ? Math.sign(ox) : h.seed % 2 < 1 ? 1 : -1,
                    nx = r > 0.01 ? ox / r : way,
                    nz = r > 0.01 ? off / r : 0;
                x = o[0] * s.scale + nx * clear + way * go * 0.7;
                z = o[1] * s.scale + nz * clear;
            }
    z = clamp(z, -s.hl * 0.92, s.hl * 0.92);
    deckAt(s, z, true, h.below);
    const w = Math.max(0, deck.w * s.scale - (h.below ? 0 : INBOARD));
    h.lx = clamp(x, -w, w);
    h.lz = z;
    h.yaw += angDiff(h.yaw, Math.atan2(-dx, -dz)) * Math.min(1, dt * 8);
    h.phase += TAU * cadence(h.speed) * dt * Math.min(1, h.speed * 2);
    return d;
}

// a hand new aboard: over her port rail amidships, where her gangway comes in
function sign(sailor: Sailor, s: Ship): Hand {
    deckAt(s, 0, true);
    return { id: sailor.id, post: sailor.post!, lx: -Math.max(0, deck.w * s.scale - 0.5), lz: (sailor.id % 5) * 0.5 - 1, y: deck.y, yaw: -Math.PI / 2, speed: 0, phase: 0, seed: (sailor.id * 3.7) % 97, doing: DOING.AFOOT, below: false, thru: false, kick: 0, pose: newPose() };
}

/** Moves the hired hands aboard the player's ship on by `dt`, and draws them. With no time step they hold still. */
export function drawHands(dt: number) {
    const s = PL.ship,
        company = aboard(S.prog.crew, berthsOf(S.prog));
    // whoever has been paid off, or stood down, is over the side; whoever is new is aboard
    for (let i = hands.length - 1; i >= 0; i--) {
        const still = company.find((c) => c.id === hands[i].id);
        if (still?.post) hands[i].post = still.post;
        else hands.splice(i, 1);
    }
    for (const c of company) if (c.post && !hands.some((h) => h.id === c.id)) hands.push(sign(c, s));
    // they went down with her
    if (s.dead || !hands.length) return;

    const Sm = trim(s),
        parts = townsman(),
        hull = s.hull;
    for (const h of hands) {
        duty(h, s);
        const atDesk = goal.below;
        byTheDoor(h, s);
        const left = pace(h, s, dt),
            there = left < THERE,
            pose = h.pose,
            tint = SLOPS[h.id % SLOPS.length];
        h.doing = there ? goal.doing : DOING.AFOOT;
        deckAt(s, h.lz, true, h.below);
        h.y = damp(h.y, deck.y, 12, dt);
        if (h.doing === DOING.HELM) {
            // his hands on her spokes, as a player's would be
            solvePose(helmPose(pose, S.t + h.seed, s.rudder));
            m4trs(Lm, 0, hull.helm[1], hull.helm[2] + ABAFT, 0, 0, 0, 1 / s.scale);
            m4mul(Bm, Sm, Lm);
            drawFigure(parts, Bm, pose, tint, WHITE);
            h.lx = 0;
            h.yaw = 0;
            continue;
        }
        if (h.doing === DOING.GUN) {
            // he looks along it at whatever his battery is laid on: the mark it last fired at, or where a captain alone is laying it
            const side = h.post === 'port' ? 0 : 1,
                b = s.bat[side],
                beam = side ? -Math.PI / 2 : Math.PI / 2,
                laid = b.left > 0 || b.t >= 0,
                aiming = !laid && PL.side === side && !PL.afoot;
            let train = 0;
            if (laid || aiming) {
                const l = toShip(s, aiming ? PL.aimX : b.tx, aiming ? PL.aimZ : b.tz);
                train = clamp(angDiff(beam, Math.atan2(h.lx - l.x, h.lz - l.z)), -TRAIN, TRAIN);
            }
            h.yaw += angDiff(h.yaw, beam + train) * Math.min(1, dt * 6);
            // and rocks back as it goes off
            if (b.t >= 0) h.kick = 1;
            h.kick = Math.max(0, h.kick - dt * 3);
            gunPose(pose, S.t + h.seed);
            pose.lean -= 0.22 * h.kick;
            pose.chestLean -= 0.25 * h.kick;
            pose.lunge -= 0.12 * h.kick;
            solvePose(pose);
        } else {
            standPose(pose, S.t, h.seed);
            const striding = smooth(0.05, 0.9, h.speed);
            if (striding > 0) mixPose(pose, gaitPose(stride, h.phase + h.seed, h.speed), striding);
            else if (h.post === 'sails') {
                // the sailing master, his eye on the set of her canvas
                pose.headNod += 0.42;
                pose.chestLean -= 0.08;
                pose.armR = 0.35;
                pose.elbowR = 1.5;
            } else if (h.post === 'carpenter' && s.hp < s.max) {
                // the carpenter, down on his heels over a sprung plank
                pose.lift -= 0.3;
                pose.lean += 0.32;
                pose.chestLean += 0.3;
                pose.headNod -= 0.2;
                pose.armL = pose.armR = 0.8 + 0.25 * Math.sin(S.t * 9 + h.seed);
                pose.elbowL = pose.elbowR = 0.7;
            } else if (atDesk && h.below && there) {
                // the purser at her table: bent over the book, a pen going in his right hand
                h.yaw += angDiff(h.yaw, Math.PI) * Math.min(1, dt * 5);
                pose.lean += 0.14;
                pose.chestLean += 0.24;
                pose.headNod -= 0.38;
                pose.headTurn = 0;
                pose.armR = 0.85 + 0.04 * Math.sin(S.t * 7 + h.seed);
                pose.elbowR = 0.75;
                pose.armL = 0.6;
                pose.elbowL = 0.9;
            } else if (h.post === 'helm') {
                // standing by, his eyes on whoever has his wheel
                pose.headTurn = 0.5;
                h.yaw += angDiff(h.yaw, 0) * Math.min(1, dt * 4);
            }
            solvePose(pose);
        }
        const at = fromShip(s, h.lx, h.lz);
        m4trs(Bm, at.x, afloat(s, h.lx, h.y, h.lz), at.z, s.yaw + h.yaw, 0, 0, 1);
        drawFigure(parts, Bm, pose, tint, WHITE);
    }
}

/** Debug: the hands aboard, as they are. */
export const handsAboard = hands;
