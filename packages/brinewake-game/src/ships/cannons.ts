import { sfx } from '@ryqndev/brinewake-audio';
import { addInstance, seaHeight, shoreCalm } from '@ryqndev/brinewake-renderer';
import { m4trs, rnds } from '@ryqndev/rimefire-math';

import { fxDust, fxMuzzle, fxSplash, sprite } from '../fx';
import { M } from '../models';
import { S } from '../state';
import { height } from '../world';
import { hitShip } from './damage';
import { B, BALL_CAPACITY, BALL_STRIDE, balls, ships } from './state';
import { type Ship, TEAM } from './types';

/** Gravity on shot, m/s². Heavier than life: it keeps flight times short and arcs readable. */
const GRAV = 22;
/** Seconds between successive guns of a broadside. */
const RIPPLE = 0.075;
/** Tangent of how far either side of the beam a battery can train. */
const TRAVERSE = Math.tan(0.84);

/** The furthest a gun with this muzzle speed is laid, a little inside its true reach. */
export const maxRange = (shot: number) => ((shot * shot) / GRAV) * 0.94;

// elevation that lands a ball `d` metres off and `dy` higher (the flatter of the two arcs); NaN out of reach
function elevation(d: number, dy: number, v: number) {
    const v2 = v * v,
        q = v2 * v2 - GRAV * (GRAV * d * d + 2 * dy * v2);
    return q < 0 ? NaN : Math.atan2(v2 - Math.sqrt(q), GRAV * d);
}

/** Which battery can be laid on a point: 0 port, 1 starboard, or -1 when it lies too far ahead or astern. */
export function bearing(s: Ship, x: number, z: number): number {
    const dx = x - s.x,
        dz = z - s.z,
        c = Math.cos(s.yaw),
        sn = Math.sin(s.yaw),
        abeam = dx * c - dz * sn,
        ahead = -dx * sn - dz * c;
    if (Math.abs(ahead) > Math.abs(abeam) * TRAVERSE) return -1;
    return abeam > 0 ? 1 : 0;
}

/** Orders a broadside from one battery onto a point on the sea. False if that side is still reloading. */
export function fireBroadside(s: Ship, side: number, tx: number, tz: number): boolean {
    const vol = s.vol[side];
    if (s.dead || s.rl[side] > 0 || vol.t >= 0) return false;
    vol.t = 0;
    vol.n = 0;
    vol.tx = tx;
    vol.tz = tz;
    s.rl[side] = s.reload;
    return true;
}

function fireGun(s: Ship, side: number, i: number) {
    const vol = s.vol[side],
        m = s.hull.muzzles[i],
        sg = side ? 1 : -1,
        c = Math.cos(s.yaw),
        sn = Math.sin(s.yaw),
        lx = m[0] * sg * s.scale,
        lz = m[2] * s.scale;
    const x = s.x + c * lx + sn * lz,
        z = s.z - sn * lx + c * lz,
        y = s.y + m[1] * s.scale;
    // each gun lays a little along the line from its neighbours, so a broadside straddles its mark
    let tx = vol.tx + sn * lz * 0.5,
        tz = vol.tz + c * lz * 0.5;
    const err = Math.hypot(tx - x, tz - z) * s.type.spread;
    tx += rnds(err);
    tz += rnds(err);
    const dx = tx - x,
        dz = tz - z,
        d = Math.hypot(dx, dz) || 1;
    let el = elevation(d, -y, s.shot);
    if (el !== el) el = 0.72;
    const h = (Math.cos(el) * s.shot) / d;
    if (balls.n < BALL_CAPACITY) {
        const o = balls.n++ * BALL_STRIDE,
            b = balls.d;
        b[o] = x;
        b[o + 1] = y;
        b[o + 2] = z;
        b[o + 3] = dx * h;
        b[o + 4] = Math.sin(el) * s.shot;
        b[o + 5] = dz * h;
        b[o + 6] = s.dmg;
        b[o + 7] = s.team;
        b[o + 8] = 0;
        b[o + 9] = s.role === 'player' ? 1 : 0;
    }
    fxMuzzle(x, y, z, dx / d, dz / d);
    sfx.cannon(x, y, z);
    // recoil rocks her away from the guns
    s.roll += sg * 0.012;
}

/** Runs a ship's reloads and any broadside in progress. */
export function updateGuns(s: Ship, dt: number) {
    for (let side = 0; side < 2; side++) {
        if (s.rl[side] > 0) s.rl[side] = Math.max(0, s.rl[side] - dt);
        const vol = s.vol[side];
        if (vol.t < 0) continue;
        vol.t += dt;
        while (vol.n < s.hull.guns && vol.t >= vol.n * RIPPLE) fireGun(s, side, vol.n++);
        if (vol.n >= s.hull.guns) vol.t = -1;
    }
}

/** Flies every ball: gravity, hits on hulls, land and sea. Also queues them for drawing. */
export function updateBalls(dt: number) {
    const b = balls.d;
    for (let i = balls.n - 1; i >= 0; i--) {
        const o = i * BALL_STRIDE;
        b[o + 4] -= GRAV * dt;
        const x = (b[o] += b[o + 3] * dt),
            y = (b[o + 1] += b[o + 4] * dt),
            z = (b[o + 2] += b[o + 5] * dt),
            team = b[o + 7];
        let gone = (b[o + 8] += dt) > 14;
        // only shot coming down to deck height can strike a hull
        if (y < 14)
            for (let k = 0; k < ships.length; k++) {
                const s = ships[k];
                // shot passes over its own side; the navy and the merchantmen do not fire on each other
                if (s.dead || s.team === team || (team !== TEAM.PIRATE && s.team !== TEAM.PIRATE)) continue;
                const dx = x - s.x,
                    dz = z - s.z;
                if (dx * dx + dz * dz > s.br2) continue;
                const c = Math.cos(s.yaw),
                    sn = Math.sin(s.yaw),
                    abeam = dx * c - dz * sn,
                    ahead = -dx * sn - dz * c;
                if (Math.abs(ahead) > s.hl || y > s.y + (s.hull.deck + 2.6) * s.scale || y < s.y - s.hull.draft * s.scale) continue;
                // the hull narrows toward the bow
                const fine = ahead > s.hl * 0.2 ? 1 - 0.85 * ((ahead / s.hl - 0.2) / 0.8) ** 2 : 1;
                if (Math.abs(abeam) > s.hb * fine + 0.4) continue;
                hitShip(s, b[o + 6], x, y, z, b[o + 3], b[o + 5], b[o + 9] > 0);
                gone = true;
                break;
            }
        if (!gone && y < 45) {
            const g = height(x, z);
            if (y < g) {
                fxDust(x, g, z);
                gone = true;
            } else if (y < 1.6) {
                const sea = seaHeight(x, z, S.t) * shoreCalm(g);
                if (y < sea) {
                    fxSplash(x, sea, z);
                    sfx.splash(x, sea, z);
                    gone = true;
                }
            }
        }
        if (gone) {
            balls.n--;
            if (i !== balls.n) b.copyWithin(o, balls.n * BALL_STRIDE, (balls.n + 1) * BALL_STRIDE);
            continue;
        }
        m4trs(B, x, y, z);
        addInstance(M.ball, B);
        // a faint streak behind each ball makes a broadside readable in flight
        sprite(2, x, y, z, 0.16, 0.55, 0.5, 0.45, 0.5, b[o + 3], b[o + 4], b[o + 5], 0.03);
    }
}
