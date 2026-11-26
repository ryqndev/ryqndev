import { cam } from '@ryqndev/brinewake-renderer';

import { PL, S } from '../state';
import { thinkShip } from './ai';
import { updateBalls, updateGuns } from './cannons';
import { director } from './director';
import { burnShip, drawShip } from './draw';
import { updateLoot } from './loot';
import { collideShips, sailShip, SINK_TIME } from './physics';
import { balls, loot, ships } from './state';

export { bearing, fireBroadside, maxRange } from './cannons';
export { hurtShip } from './damage';
export { CLASS_COST, CLASSES, ESCORT, ESCORT_COST, FOES, HOLDS, INFAMY, infamyOf, MAX_ESCORTS, MAX_LEVEL, UP, type Upgrade, upgradeCost, UPGRADES } from './defs';
export { resetDirector } from './director';
export { makeShip, measure } from './spawn';
export { balls, D, loot, ships } from './state';
export { type Ship, type ShipType, TEAM } from './types';

/** Clears the sea of every ship, shot and crate. */
export function resetShips() {
    ships.length = loot.length = balls.n = 0;
}

/**
 * Advances and draws everything afloat. `war` is true while the player is at sea: only then do
 * captains hunt, the director launch ships and plunder get hauled aboard. With dt = 0 it just
 * re-submits the frozen scene for drawing.
 */
export function updateShips(dt: number, war: boolean) {
    const p = PL.ship;
    let fire = 0;
    for (let i = ships.length - 1; i >= 0; i--) {
        const s = ships[i];
        if (dt > 0) {
            if (!s.dead && s !== p) thinkShip(s, dt, p, war);
            sailShip(s, dt);
            if (!s.dead) updateGuns(s, dt);
            s.flash = Math.max(0, s.flash - dt * 4);
            // the player's wreck stays put until they sail again; any other is gone once it is under
            if (s.dead && s.sink > SINK_TIME && s !== p) {
                ships.splice(i, 1);
                continue;
            }
        }
        if (s.dead && s.sink > SINK_TIME) continue;
        drawShip(s);
        const burning = burnShip(s, dt);
        if (burning > 0) fire += burning / (1 + ((s.x - cam.x) ** 2 + (s.z - cam.z) ** 2) / 3600);
    }
    S.fire = fire;
    if (dt > 0) collideShips(dt);
    updateBalls(dt);
    updateLoot(dt, war ? p : null);
    if (war && dt > 0) director(dt, p);
}
