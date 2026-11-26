import { sfx } from '@ryqndev/brinewake-audio';
import { addInstance, seaHeight, shoreCalm } from '@ryqndev/brinewake-renderer';
import { m4trs, rnds } from '@ryqndev/kiln-math';

import { fxDust, fxMuzzle, fxSplash, sprite } from '../fx';
import { M } from '../models';
import { S } from '../state';
import { height } from '../world';
import { gunFires, tickBattery } from './battery';
import { hitShip } from './damage';
import { B, BALL_CAPACITY, BALL_STRIDE, balls, ships } from './state';
import { type Ship, TEAM } from './types';

/** Gravity on shot, m/s². Heavier than life: it keeps flight times short and arcs readable. */
const GRAV = 22;
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

// Lays gun `i` of a battery on the point its broadside was ordered onto, and fires it.
function fireGun(s: Ship, side: number, i: number) {
    const aim = s.bat[side],
        gun = aim.gun,
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
    let tx = aim.tx + sn * lz * 0.5,
        tz = aim.tz + c * lz * 0.5;
    const err = Math.hypot(tx - x, tz - z) * gun.spread;
    tx += rnds(err);
    tz += rnds(err);
    const dx = tx - x,
        dz = tz - z,
        d = Math.hypot(dx, dz) || 1;
    let el = elevation(d, -y, gun.shot);
    if (el !== el) el = 0.72;
    const h = (Math.cos(el) * gun.shot) / d;
    launchBall(x, y, z, dx * h, Math.sin(el) * gun.shot, dz * h, gun.dmg, s.team, s.role === 'player');
    fxMuzzle(x, y, z, dx / d, dz / d);
    sfx.cannon(x, y, z, gun.heft);
    // recoil rocks her away from the guns
    s.roll += sg * 0.012;
}

/** Runs a ship's reloads, and fires the guns of any broadside as their moments come. */
export function updateGuns(s: Ship, dt: number) {
    for (let side = 0; side < 2; side++) {
        const b = s.bat[side];
        tickBattery(b, dt);
        for (let i = 0; i < s.hull.guns; i++) if (gunFires(b, i)) fireGun(s, side, i);
    }
}

// Puts a ball in flight. The pool is fixed: when it is full the shot is simply not seen.
function launchBall(x: number, y: number, z: number, vx: number, vy: number, vz: number, dmg: number, team: number, mine: boolean) {
    if (balls.n >= BALL_CAPACITY) return;
    const o = balls.n++ * BALL_STRIDE,
        b = balls.d;
    b[o] = x;
    b[o + 1] = y;
    b[o + 2] = z;
    b[o + 3] = vx;
    b[o + 4] = vy;
    b[o + 5] = vz;
    b[o + 6] = dmg;
    b[o + 7] = team;
    b[o + 8] = 0;
    b[o + 9] = mine ? 1 : 0;
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
