// The rest of the crew, as this player sees them: each mate eased toward where they last said they
// were, and drawn the way the captain is (afoot.ts), in less detail. A mate on deck is kept in the
// ship's own frame, so she carries them with her however late the news of either arrives.
import { angDiff, damp, m4, m4mul, m4trs, smooth, TAU } from '@ryqndev/kiln-math';

import { ABAFT, AFLOAT, BUILD, captainParts } from './afoot';
import { afloat, deck, deckAt, fromShip, trim } from './deck';
import { airPose, cadence, drawFigure, gaitPose, gunPose, helmPose, mixPose, newPose, solvePose, standPose, swimPose } from './figure';
import { beamYaw, gunSpot, servable } from './gunner';
import { COATS, type Mate, mates, POST } from './posts';
import { ON, PL, S } from './state';

/** How briskly a mate closes on where they said they were: a tenth of a second or so behind the news. */
const EASE = 14;
/** Past this far from it they are put there at once: they were moved, not walking. Metres. */
const JUMPED = 8;
/** Metres a second a mate swims at, for the pace of their stroke. */
const SWIM = 2.5;

const PLAIN = [1, 1, 1];
const Bm = m4(),
    Lm = m4();
const stride = newPose();

/** A mate who has just come aboard, with nothing yet known of where. */
export const newMate = (id: number, name: string): Mate => ({
    id, name, seen: false, on: ON.LAND, tx: 0, ty: 0, tz: 0, tyaw: 0, x: 0, y: 0, z: 0, yaw: 0, wx: 0, wy: 0, wz: 0, speed: 0, air: false,
    post: POST.NONE, side: 0, gun: 0, rudder: 0, sail: 0, phase: 0, seed: id * 7.3, pose: newPose(),
});

/**
 * Takes in where a mate now says they are (see Mate.tx). The first word of them, a change of what
 * they stand on, and any move too big to have been walked put them there at once.
 */
export function placeMate(m: Mate, on: number, x: number, y: number, z: number, yaw: number) {
    const moved = !m.seen || (on === ON.DECK) !== (m.on === ON.DECK) || Math.hypot(x - m.x, z - m.z) > JUMPED;
    // off a deck and onto one, what they are measured in changes under them: carry them across it
    if (m.seen && (on === ON.DECK) !== (m.on === ON.DECK)) {
        m.x = x;
        m.y = y;
        m.z = z;
    }
    m.on = on;
    m.tx = x;
    m.ty = y;
    m.tz = z;
    m.tyaw = yaw;
    if (moved) {
        m.x = x;
        m.y = y;
        m.z = z;
        m.yaw = yaw;
    }
    m.seen = true;
}

/** Moves every mate on by `dt` and draws them. With no time step they hold still. */
export function drawMates(dt: number) {
    if (!mates.length) return;
    const s = PL.ship,
        Sm = trim(s),
        parts = captainParts();
    for (const m of mates) {
        if (!m.seen) continue;
        const coat = COATS[m.id] ?? s.paint,
            pose = m.pose;
        if (m.post === POST.HELM && !s.dead) {
            // at her wheel, their hands on its spokes
            const h = s.hull.helm,
                lz = (h[2] + ABAFT) * s.scale,
                at = fromShip(s, 0, lz);
            m.wx = at.x;
            m.wy = afloat(s, 0, h[1], lz);
            m.wz = at.z;
            solvePose(helmPose(pose, S.t + m.seed, m.rudder));
            m4trs(Lm, 0, h[1], h[2] + ABAFT, 0, 0, 0, BUILD / s.scale);
            m4mul(Bm, Sm, Lm);
            drawFigure(parts, Bm, pose, coat, PLAIN);
            continue;
        }
        if (m.post === POST.GUN && !s.dead && servable(s, m.side, m.gun)) {
            // standing to their gun, facing the way they have trained it
            const p = gunSpot(s, m.side, m.gun),
                lx = p.lx,
                lz = p.lz,
                at = fromShip(s, lx, lz);
            deckAt(s, lz, true);
            m.wx = at.x;
            m.wy = afloat(s, lx, deck.y, lz);
            m.wz = at.z;
            m.yaw += angDiff(m.yaw, m.tyaw) * (1 - Math.exp(-EASE * dt));
            solvePose(gunPose(pose, S.t + m.seed));
            m4trs(Bm, m.wx, m.wy, m.wz, beamYaw(s, m.side) + m.yaw, 0, 0, BUILD);
            drawFigure(parts, Bm, pose, coat, PLAIN);
            continue;
        }
        m.x = damp(m.x, m.tx, EASE, dt);
        m.y = damp(m.y, m.ty, EASE, dt);
        m.z = damp(m.z, m.tz, EASE, dt);
        m.yaw += angDiff(m.yaw, m.tyaw) * (1 - Math.exp(-EASE * dt));
        let yaw = m.yaw;
        if (m.on === ON.DECK && !s.dead) {
            const at = fromShip(s, m.x, m.z);
            deckAt(s, m.z, true);
            m.wx = at.x;
            m.wy = afloat(s, m.x, deck.y, m.z) + m.y;
            m.wz = at.z;
            yaw += s.yaw;
        } else {
            m.wx = m.x;
            m.wy = m.y;
            m.wz = m.z;
        }
        const swimming = m.on === ON.SEA && !m.air;
        m.phase += swimming ? (1.2 + 3 * (m.speed / SWIM)) * dt : TAU * cadence(m.speed) * dt * Math.min(1, m.speed * 2);
        if (swimming) swimPose(pose, m.phase, m.speed / SWIM);
        else if (m.air) airPose(pose, 0);
        else {
            standPose(pose, S.t, m.seed);
            const striding = smooth(0.05, 0.9, m.speed);
            if (striding > 0) mixPose(pose, gaitPose(stride, m.phase, m.speed), striding);
        }
        solvePose(pose, !swimming && !m.air);
        // afloat, their hips ride just under the surface
        m4trs(Bm, m.wx, m.wy + (swimming ? AFLOAT - 0.28 : 0), m.wz, yaw, 0, 0, BUILD);
        drawFigure(parts, Bm, pose, coat, PLAIN);
    }
}
