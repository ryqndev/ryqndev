import { sfx } from '@ryqndev/brinewake-audio';
import { addInstance, seaHeight, shoreCalm } from '@ryqndev/brinewake-renderer';
import { m4aim, m4trs, rnds } from '@ryqndev/kiln-math';

import { fxDust, fxExplosion, fxMuzzle, fxSplash, shake, sprite } from '../fx';
import { M } from '../models';
import { PL, S } from '../state';
import { height } from '../world';
import { gunFires, tickBattery } from './battery';
import { hitShip, hurtShip, snare } from './damage';
import { fortAt, hitFort } from './forts';
import { B, BALL_CAPACITY, BALL_STRIDE, balls, ships } from './state';
import { type GunStats, type Ship, SHOT, TEAM } from './types';

/** Gravity on shot, m/s². Heavier than life: it keeps flight times short and arcs readable. */
const GRAV = 22;
/** Tangent of how far either side of the beam a battery can train. */
const TRAVERSE = Math.tan(0.84);
/** The angle a mortar is bedded at: its range is set by the charge, not by laying the piece. */
const MORTAR = 0.87;
/** How far from where it bursts a shell does harm, metres. */
const BLAST = 11;
/** Hemp, tarred iron: what a harpoon's line and its shaft are tinted. */
const LINE = [0.3, 0.25, 0.17],
    IRON = [0.05, 0.05, 0.055];

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

/**
 * Throws one ball of a gun's shot from a point at a mark on the sea, with the gun's own error.
 * Everything that fires goes through here: a ship's batteries and a fort's embrasures alike.
 */
export function throwShot(gun: GunStats, x: number, y: number, z: number, tx: number, tz: number, team: number, mine: boolean) {
    const err = Math.hypot(tx - x, tz - z) * gun.spread;
    tx += rnds(err);
    tz += rnds(err);
    const dx = tx - x,
        dz = tz - z,
        d = Math.hypot(dx, dz) || 1;
    let el: number,
        v = gun.shot;
    if (gun.kind === SHOT.SHELL) {
        // a mortar stands at one angle and is given the charge for the range, as far as its full charge carries
        el = MORTAR;
        v = Math.min(v, Math.sqrt((GRAV * d * d) / (2 * Math.cos(el) ** 2 * (d * Math.tan(el) + y))));
    } else {
        el = elevation(d, -y, v);
        if (el !== el) el = 0.72;
    }
    const h = (Math.cos(el) * v) / d;
    launchBall(x, y, z, dx * h, Math.sin(el) * v, dz * h, gun, team, mine);
    return d;
}

// Lays gun `i` of a battery on the point its broadside was ordered onto, and fires it.
function fireGun(s: Ship, side: number, i: number) {
    const aim = s.bat[side],
        gun = aim.gun,
        m = s.hull.muzzles[side][i],
        sg = side ? 1 : -1,
        c = Math.cos(s.yaw),
        sn = Math.sin(s.yaw),
        lx = m[0] * sg * s.scale,
        lz = m[2] * s.scale;
    const x = s.x + c * lx + sn * lz,
        z = s.z - sn * lx + c * lz,
        y = s.y + m[1] * s.scale;
    // each gun lays a little along the line from its neighbours, so a broadside straddles its mark
    const tx = aim.tx + sn * lz * 0.5,
        tz = aim.tz + c * lz * 0.5;
    for (let n = 0; n < gun.pellets; n++) throwShot(gun, x, y, z, tx, tz, s.team, s.role === 'player');
    const d = Math.hypot(tx - x, tz - z) || 1;
    fxMuzzle(x, y, z, (tx - x) / d, (tz - z) / d);
    sfx.cannon(x, y, z, gun.heft);
    // recoil rocks her away from the guns
    s.roll += sg * 0.012 * Math.min(2, gun.heft);
}

/** Runs a ship's reloads, and fires the guns of any broadside as their moments come. */
export function updateGuns(s: Ship, dt: number) {
    for (let side = 0; side < 2; side++) {
        const b = s.bat[side];
        tickBattery(b, dt);
        for (let i = 0; i < s.hull.guns[side]; i++) if (gunFires(b, i)) fireGun(s, side, i);
    }
}

// Puts a ball in flight. The pool is fixed: when it is full the shot is simply not seen.
function launchBall(x: number, y: number, z: number, vx: number, vy: number, vz: number, gun: GunStats, team: number, mine: boolean) {
    if (balls.n >= BALL_CAPACITY) return;
    const o = balls.n++ * BALL_STRIDE,
        b = balls.d;
    b[o] = x;
    b[o + 1] = y;
    b[o + 2] = z;
    b[o + 3] = vx;
    b[o + 4] = vy;
    b[o + 5] = vz;
    b[o + 6] = gun.dmg;
    b[o + 7] = team;
    b[o + 8] = 0;
    b[o + 9] = mine ? 1 : 0;
    b[o + 10] = gun.kind;
    b[o + 11] = gun.crew;
    b[o + 12] = gun.rig;
    b[o + 13] = gun.stone;
}

// whether shot fired by `team` harms a ship: it passes over its own side, and the navy and the merchantmen do not fire on each other
const harms = (team: number, s: Ship) => !s.dead && s.team !== team && (team === TEAM.PIRATE || s.team === TEAM.PIRATE);

// A shell going off: everything afloat near it is hurt, the less the further away, and so is a fort it lands on or beside.
function burst(x: number, y: number, z: number, dmg: number, team: number, mine: boolean, struck: Ship | null) {
    fxExplosion(x, Math.max(y, 0.5), z, 0.55);
    sfx.hit(x, y, z);
    if (mine) shake(0.08);
    for (const s of ships) {
        if (s === struck || !harms(team, s)) continue;
        const d = Math.hypot(s.x - x, s.z - z) - s.hb;
        if (d < BLAST) hurtShip(s, dmg * (1 - Math.max(0, d) / BLAST) * 0.6, mine);
    }
    if (team === TEAM.PIRATE) {
        const f = fortAt(x, z, BLAST * 0.6);
        if (f) hitFort(f, dmg * 0.5, x, y, z, mine);
    }
}

// a line or a shaft from one point to another, as the unit rope drawn out between them
function drawLine(ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, c: number[]) {
    const dx = bx - ax,
        dy = by - ay,
        dz = bz - az;
    m4aim(B, ax, ay, az, dx, dy, dz, r, Math.hypot(dx, dy, dz), r);
    addInstance(M.rope, B, c[0], c[1], c[2]);
}

/** Draws the line a harpooned ship is held by, from the ship that holds her. */
export function drawTether(s: Ship) {
    const h = s.holder;
    if (!h || s.snare <= 0) return;
    const ay = h.y + (h.hull.deck + 1) * h.scale,
        by = s.y + (s.hull.deck + 0.6) * s.scale,
        mx = (h.x + s.x) / 2,
        mz = (h.z + s.z) / 2,
        // slack hangs toward the water; a taut line lies straight
        sag = Math.min(ay, by) * 0.5 * Math.max(0, 1 - Math.hypot(h.x - s.x, h.z - s.z) / (h.hl + s.hl + 26)),
        my = (ay + by) / 2 - sag;
    drawLine(h.x, ay, h.z, mx, my, mz, 0.05, LINE);
    drawLine(mx, my, mz, s.x, by, s.z, 0.05, LINE);
}

/** Flies every ball: gravity, hits on hulls, forts, land and sea. Also queues them for drawing. */
export function updateBalls(dt: number) {
    const b = balls.d;
    for (let i = balls.n - 1; i >= 0; i--) {
        const o = i * BALL_STRIDE;
        b[o + 4] -= GRAV * dt;
        const x = (b[o] += b[o + 3] * dt),
            y = (b[o + 1] += b[o + 4] * dt),
            z = (b[o + 2] += b[o + 5] * dt),
            team = b[o + 7],
            kind = b[o + 10],
            mine = b[o + 9] > 0;
        let gone = (b[o + 8] += dt) > 14,
            landed = false,
            struck: Ship | null = null;
        // only shot coming down to deck height can strike a hull
        if (y < 14)
            for (let k = 0; k < ships.length; k++) {
                const s = ships[k];
                if (!harms(team, s)) continue;
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
                hitShip(s, b[o + 6], x, y, z, b[o + 3], b[o + 5], mine, b[o + 11], b[o + 12]);
                if (kind === SHOT.HARPOON && mine) snare(s, PL.ship);
                struck = s;
                gone = landed = true;
                break;
            }
        // a fort stands to be hit by whatever a pirate throws at it
        if (!gone && team === TEAM.PIRATE && y < 30) {
            const f = fortAt(x, z, 0);
            if (f && y < f.top) {
                hitFort(f, b[o + 6] * b[o + 13], x, y, z, mine);
                gone = landed = true;
            }
        }
        if (!gone && y < 45) {
            const g = height(x, z);
            if (y < g) {
                fxDust(x, g, z);
                gone = landed = true;
            } else if (y < 1.6) {
                const sea = seaHeight(x, z, S.t) * shoreCalm(g);
                if (y < sea) {
                    fxSplash(x, sea, z, kind === SHOT.GRAPE ? 0.45 : 1);
                    if (kind !== SHOT.GRAPE) sfx.splash(x, sea, z);
                    gone = landed = true;
                }
            }
        }
        if (gone) {
            if (landed && kind === SHOT.SHELL) burst(x, y, z, b[o + 6], team, mine, struck);
            balls.n--;
            if (i !== balls.n) b.copyWithin(o, balls.n * BALL_STRIDE, (balls.n + 1) * BALL_STRIDE);
            continue;
        }
        if (kind === SHOT.HARPOON) {
            // the iron, and the line paying out behind it from the ship that threw it
            const v = Math.hypot(b[o + 3], b[o + 4], b[o + 5]) || 1,
                k = 2.4 / v;
            drawLine(x - b[o + 3] * k, y - b[o + 4] * k, z - b[o + 5] * k, x, y, z, 0.07, IRON);
            if (mine) {
                const p = PL.ship;
                drawLine(p.x, p.y + (p.hull.deck + 1) * p.scale, p.z, x - b[o + 3] * k, y - b[o + 4] * k, z - b[o + 5] * k, 0.04, LINE);
            }
            continue;
        }
        const size = kind === SHOT.GRAPE ? 0.42 : kind === SHOT.SHELL ? 1.9 : kind === SHOT.CHAIN ? 0.8 : 1;
        m4trs(B, x, y, z, 0, 0, 0, size);
        addInstance(M.ball, B);
        if (kind === SHOT.CHAIN) {
            // two half-balls on a length of chain, tumbling as they go
            const a = S.t * 19 + i,
                r = 0.75;
            m4trs(B, x + Math.cos(a) * r, y + Math.sin(a * 0.7) * r * 0.5, z + Math.sin(a) * r, 0, 0, 0, size);
            addInstance(M.ball, B);
        }
        // a faint streak behind each ball makes a broadside readable in flight; a shell trails its fuse
        if (kind === SHOT.SHELL) sprite(2, x, y, z, 0.5, 1.6, 0.8, 0.3, 0.7, b[o + 3], b[o + 4], b[o + 5], 0.05);
        else sprite(2, x, y, z, 0.16 * Math.max(0.6, size), 0.55, 0.5, 0.45, 0.5, b[o + 3], b[o + 4], b[o + 5], 0.03);
    }
}
