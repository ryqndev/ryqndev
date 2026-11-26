import { angDiff, clamp, PI } from '@ryqndev/rimefire-math';

import { height, SEA, W } from '../world';
import { bearing, fireBroadside, maxRange } from './cannons';
import { ships } from './state';
import { AI, type Ship, TEAM } from './types';

/** How far off the navy spots a pirate, metres. */
const SIGHT = 270;
/** Escorts break formation for enemies this close to their leader. */
const SCREEN = 240;
/** Depth the helmsman wants under the bow, metres. */
const SOUNDING = -4.5;

const yawTo = (s: Ship, x: number, z: number) => Math.atan2(s.x - x, s.z - z);

// nearest living ship to (x, z) that passes the test, within `range`
function nearest(x: number, z: number, range: number, ok: (o: Ship) => boolean): Ship | null {
    let best: Ship | null = null,
        bd = range * range;
    for (let i = 0; i < ships.length; i++) {
        const o = ships[i];
        if (o.dead || !ok(o)) continue;
        const d = (o.x - x) ** 2 + (o.z - z) ** 2;
        if (d < bd) {
            bd = d;
            best = o;
        }
    }
    return best;
}
const isPirate = (o: Ship) => o.team === TEAM.PIRATE;
// what a consort will fight: the navy, and any merchantman its captain has already fired on
const isPrey = (o: Ship) => o.team === TEAM.NAVY || (o.team === TEAM.TRADE && o.aggro > 0);
// the harbour's guns keep the navy off a pirate lying in the anchorage, unless he has just fired on them
const sheltered = (o: Ship, by: Ship) => by.aggro <= 0 && Math.hypot(o.x - W.port.x, o.z - W.port.z) < W.port.r + 40;

// sail the ring of waypoints around the archipelago, each ship in its own direction
function cruise(s: Ship, canvas: number) {
    const n = W.routes.length;
    let p = W.routes[s.wp];
    if (Math.hypot(p[0] - s.x, p[1] - s.z) < 55) {
        s.wp = (s.wp + s.orbit + n) % n;
        p = W.routes[s.wp];
    }
    s.st = AI.CRUISE;
    s.goal = yawTo(s, p[0], p[1]);
    s.want = canvas;
}

// close to gun range, then lie beam-on and circle, holding the range and firing as the guns bear
function engage(s: Ship, t: Ship) {
    const d = Math.hypot(t.x - s.x, t.z - s.z),
        to = yawTo(s, t.x, t.z),
        reach = maxRange(s.shot) * 0.82,
        ideal = Math.min(reach * 0.62, 125);
    s.st = AI.ENGAGE;
    if (d > reach * 0.95) {
        s.goal = to + s.orbit * 0.25;
        s.want = 3;
    } else {
        s.goal = to + s.orbit * (PI / 2 + clamp((ideal - d) / ideal, -0.5, 0.45));
        s.want = d < ideal * 0.6 ? 2 : 3;
    }
    shoot(s, t, d);
}

// fire whichever battery bears, laid ahead of the target by the ball's time of flight
function shoot(s: Ship, t: Ship, d: number) {
    if (d > maxRange(s.shot) * 0.9) return;
    const flight = d / (s.shot * 0.8),
        ax = t.x - Math.sin(t.yaw) * t.v * flight,
        az = t.z - Math.cos(t.yaw) * t.v * flight,
        side = bearing(s, ax, az);
    if (side >= 0) fireBroadside(s, side, ax, az);
}

// station astern of the leader, to port or starboard by slot; match her canvas once in place
function follow(s: Ship, lead: Ship) {
    const c = Math.cos(lead.yaw),
        sn = Math.sin(lead.yaw),
        side = s.slot ? 1 : -1,
        back = lead.hl + 26,
        px = lead.x + c * side * 26 + sn * back,
        pz = lead.z - sn * side * 26 + c * back,
        d = Math.hypot(px - s.x, pz - s.z);
    s.st = AI.FOLLOW;
    s.goal = d > 14 ? yawTo(s, px, pz) : lead.yaw;
    s.want = d > 80 ? 3 : d > 24 ? Math.min(3, lead.sail + 1) : lead.sail;
}

// highest ground along a line `dist` metres out on a bearing `da` off the bow
function sound(s: Ship, da: number, dist: number) {
    const fx = -Math.sin(s.yaw + da),
        fz = -Math.cos(s.yaw + da);
    return Math.max(height(s.x + fx * dist * 0.5, s.z + fz * dist * 0.5), height(s.x + fx * dist, s.z + fz * dist));
}

// the lookout: turn for deeper water when it shoals ahead, and stay on the chart
function avoid(s: Ship) {
    const look = s.hl + 22 + s.v * 4,
        ahead = sound(s, 0, look),
        port = sound(s, 0.6, look * 0.8),
        star = sound(s, -0.6, look * 0.8);
    if (ahead > SOUNDING || port > SOUNDING || star > SOUNDING) {
        s.goal = s.yaw + (port < star ? 1 : -1) * (ahead > SOUNDING ? 1.3 : 0.6);
        s.want = Math.min(s.want, ahead > -2 ? 1 : 2);
    } else if (Math.hypot(s.x, s.z) > SEA - 50) s.goal = yawTo(s, 0, 0);
}

/**
 * One ship's helmsman and captain. The helm follows the last order every frame; the captain
 * reconsiders a few times a second. `war` is false while the player is not at sea, and nobody
 * hunts pirates then.
 */
export function thinkShip(s: Ship, dt: number, lead: Ship, war: boolean) {
    s.rudder = clamp(angDiff(s.yaw, s.goal) * 2.2, -1, 1);
    s.sail = s.want;
    if ((s.think -= dt) > 0) return;
    const since = 0.25 + Math.random() * 0.1;
    s.think = since;
    s.aggro = Math.max(0, s.aggro - since);
    if (s.role === 'escort') {
        const foe = war ? nearest(lead.x, lead.z, SCREEN, isPrey) : null;
        if (foe) engage(s, foe);
        else follow(s, lead);
    } else if (s.team === TEAM.TRADE) {
        // a merchantman fired on runs for it, shooting back if the chase comes alongside
        const threat = s.aggro > 0 && war ? nearest(s.x, s.z, 420, isPirate) : null;
        if (threat) {
            s.st = AI.FLEE;
            s.goal = yawTo(s, threat.x, threat.z) + PI;
            s.want = 3;
            shoot(s, threat, Math.hypot(threat.x - s.x, threat.z - s.z));
        } else cruise(s, 2);
    } else {
        // the navy: patrols fight what they sight; hunters and the flagship always know where the player is
        const hunts = s.role !== 'patrol' && !lead.dead;
        const foe = !war ? null : hunts && !sheltered(lead, s) ? lead : nearest(s.x, s.z, SIGHT, (o) => isPirate(o) && !sheltered(o, s));
        if (foe) engage(s, foe);
        else cruise(s, s.role === 'patrol' ? 2 : 3);
    }
    avoid(s);
}
