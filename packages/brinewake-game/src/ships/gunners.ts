// The hired hands at the guns, in a crew. With players serving guns of their own there is nobody
// at the wheel ordering broadsides, so a battery that has a gun captain posted to it (see crew.ts)
// fights on its own: whenever its guns are loaded and something worth firing at lies inside their
// arc, he fires every gun that no player is serving. A battery with no gun captain stays silent
// until a player takes one of its guns.
import { gunManned } from '../posts';
import { S } from '../state';
import { fireBroadside } from './battery';
import { bearing, maxRange } from './cannons';
import { aboard, manning } from './crew';
import { berthsOf } from './fittings';
import { ships } from './state';
import { type Ship, TEAM } from './types';

/** How often a gun captain looks for a mark, seconds. */
const LOOK = 0.35;
/** Left to themselves, the hands take this much longer over a reload, and throw their shot this much wider. */
const SLOW = 1.5,
    WILD = 1.6;

let look = 0;

/** Runs the gun captains of a crew's ship: each fires his battery's unattended guns at the nearest enemy that bears. */
export function hiredGuns(s: Ship, dt: number) {
    if ((look -= dt) > 0) return;
    look = LOOK;
    if (s.dead || s.struck) return;
    const company = aboard(S.prog.crew, berthsOf(S.prog));
    for (let side = 0; side < 2; side++) {
        const b = s.bat[side];
        if (b.left > 0 || b.t >= 0 || manning(company, side ? 'starboard' : 'port') <= 0) continue;
        const spared = (i: number) => gunManned(side, i);
        // every gun of it may be in a player's hands
        let theirs = 0;
        for (let i = 0; i < s.hull.guns[side]; i++) if (!spared(i)) theirs++;
        if (!theirs) continue;
        const shot = b.gun.shot;
        let best = (maxRange(shot) * 0.9) ** 2,
            ax = 0,
            az = 0,
            found = false;
        for (const o of ships) {
            // the navy, and any merchantman the crew has already opened fire on; never one that has struck
            if (o.dead || o.struck || o.team === TEAM.PIRATE || (o.team === TEAM.TRADE && o.aggro <= 0)) continue;
            const d2 = (o.x - s.x) ** 2 + (o.z - s.z) ** 2;
            if (d2 >= best) continue;
            // laid ahead of her by the ball's time of flight
            const flight = Math.sqrt(d2) / (shot * 0.8),
                x = o.x - Math.sin(o.yaw) * o.v * flight,
                z = o.z - Math.cos(o.yaw) * o.v * flight;
            if (bearing(s, x, z) !== side) continue;
            best = d2;
            ax = x;
            az = z;
            found = true;
        }
        if (found) fireBroadside(s, side, ax, az, spared, SLOW, WILD);
    }
}
