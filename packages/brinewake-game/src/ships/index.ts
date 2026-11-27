import { cam } from '@ryqndev/brinewake-renderer';

import { NET } from '../net/role';
import { PL, S } from '../state';
import { thinkShip } from './ai';
import { drawTether, muzzleBlast, throwShot, updateBalls, updateGuns } from './cannons';
import { takePrize } from './damage';
import { director } from './director';
import { burnShip, drawShip } from './draw';
import { resetForts, updateForts } from './forts';
import { hiredGuns } from './gunners';
import { updateLoot } from './loot';
import { collideShips, ghostShip, haul, sailShip, SINK_TIME } from './physics';
import { balls, loot, ships } from './state';

export { fireBroadside, gunLoaded, gunProgress, gunsReady, spendGun } from './battery';
export { bearing, CREDIT, maxRange, muzzleBlast, muzzleOf, putBall, serveGun, TRAIN } from './cannons';
export { hurtShip, sinkFx } from './damage';
export { CLASS_COST, CLASSES, ESCORT, ESCORT_COST, FOES, HOLDS, INFAMY, infamyOf, MAX_ESCORTS, MAX_LEVEL, UP, type Upgrade, upgradeCost, UPGRADES } from './defs';
export { resetDirector } from './director';
export { sackFx } from './forts';
export { makeShip, measure, shipById } from './spawn';
export { balls, D, type Fort, forts, type Loot, loot, ships } from './state';
export { MOUNT, type Ship, type ShipType, SHOT, TEAM } from './types';

/** How close the player must lie to a ship that has struck to take her, beyond the two hulls' lengths, metres. */
const ALONGSIDE = 14;

/** Clears the sea of every ship, shot and crate. */
export function resetShips() {
    ships.length = loot.length = balls.n = 0;
    resetForts();
}

/**
 * Advances and draws everything afloat. `war` is true while the player is at sea: only then do
 * captains hunt, the director launch ships and plunder get hauled aboard. With dt = 0 it just
 * re-submits the frozen scene for drawing.
 *
 * In someone else's crew nothing is decided here: every ship is a picture of the host's, moved on
 * from what the host last said of her, and the shot in the air does no harm (see net/session.ts).
 */
export function updateShips(dt: number, war: boolean) {
    const p = PL.ship,
        ghost = NET.client;
    war &&= !ghost;
    let fire = 0;
    for (let i = ships.length - 1; i >= 0; i--) {
        const s = ships[i];
        if (dt > 0 && ghost) {
            ghostShip(s, dt);
            s.flash = Math.max(0, s.flash - dt * 4);
        } else if (dt > 0) {
            if (!s.dead && s !== p) thinkShip(s, dt, p, war);
            sailShip(s, dt);
            haul(s, dt);
            if (!s.dead) updateGuns(s, dt);
            // a ship that has struck is the player's as soon as they lie alongside her
            if (war && s.struck && !p.dead && Math.hypot(s.x - p.x, s.z - p.z) < s.hl + p.hl + ALONGSIDE) takePrize(s);
            s.flash = Math.max(0, s.flash - dt * 4);
            // the player's wreck stays put until they sail again; any other is gone once it is under
            if (s.dead && s.sink > SINK_TIME && s !== p) {
                ships.splice(i, 1);
                continue;
            }
        }
        if (s.dead && s.sink > SINK_TIME) continue;
        drawShip(s);
        drawTether(s);
        const burning = burnShip(s, dt);
        if (burning > 0) fire += burning / (1 + ((s.x - cam.x) ** 2 + (s.z - cam.z) ** 2) / 3600);
    }
    S.fire = fire;
    if (dt > 0 && !ghost) collideShips(dt);
    // with players at guns of their own, the hired hands fight the rest of them (gunners.ts)
    if (war && NET.host && dt > 0) hiredGuns(p, dt);
    updateForts(dt, war, p, muzzleBlast, throwShot);
    updateBalls(dt);
    updateLoot(dt, war ? p : null);
    if (war && dt > 0) director(dt, p);
}
