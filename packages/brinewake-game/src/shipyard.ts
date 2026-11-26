import { sfx } from '@ryqndev/brinewake-audio';

import { HULLS } from './models';
import { saveProgress } from './save';
import { CLASS_COST, CLASSES, ESCORT, ESCORT_COST, HOLDS, MAX_ESCORTS, MAX_LEVEL, UP, upgradeCost, UPGRADES } from './ships/defs';
import { makeShip, measure } from './ships/spawn';
import { type Ship, TEAM } from './ships/types';
import { PL, S } from './state';

/** The most plunder the player's hold takes, in gold. */
export const holdCap = () => Math.round(HOLDS[S.prog.cls] * (1 + 0.4 * S.prog.levels[UP.HOLD]));

/** Rebuilds the player's ship from what they own: hull class plus every upgrade. Comes out fully repaired. */
export function refit(s: Ship) {
    const { cls, levels } = S.prog,
        c = CLASSES[cls];
    s.type = c;
    s.hull = HULLS[c.hull];
    s.scale = c.scale;
    measure(s);
    s.max = s.hp = Math.round(c.hp * (1 + 0.18 * levels[UP.HULL]));
    s.dmg = c.dmg * (1 + 0.14 * levels[UP.CANNONS]);
    s.reload = c.reload * Math.pow(0.91, levels[UP.CREW]);
    s.speed = c.speed * (1 + 0.06 * levels[UP.SAILS]);
    s.turn = c.turn * (1 + 0.1 * levels[UP.RUDDER]);
    s.rl[0] = s.rl[1] = 0;
}

/** Launches a hired consort astern of the player, in formation slot `slot`. */
export function launchEscort(slot: number) {
    const p = PL.ship,
        side = slot ? 1 : -1,
        back = p.hl + 26,
        e = makeShip('escort', TEAM.PIRATE, ESCORT, p.x + Math.cos(p.yaw) * side * 26 + Math.sin(p.yaw) * back, p.z - Math.sin(p.yaw) * side * 26 + Math.cos(p.yaw) * back, p.yaw);
    e.slot = slot;
    e.want = 0;
}

// takes payment if the player is in port and can afford it
function pay(cost: number): boolean {
    if (S.mode !== 'port' || S.prog.gold < cost) {
        sfx.deny();
        return false;
    }
    S.prog.gold -= cost;
    sfx.buy();
    return true;
}

/** Buys the next level of an upgrade (index into UPGRADES). */
export function buyUpgrade(id: number) {
    const level = S.prog.levels[id];
    if (!UPGRADES[id] || level >= MAX_LEVEL || !pay(upgradeCost(id, level))) return;
    S.prog.levels[id] = level + 1;
    refit(PL.ship);
    saveProgress();
}

/** Trades up to the next hull. Upgrades carry over. */
export function buyShip() {
    const next = S.prog.cls + 1;
    if (next >= CLASSES.length || !pay(CLASS_COST[next])) return;
    S.prog.cls = next;
    refit(PL.ship);
    saveProgress();
}

/** Hires a consort to sail and fight alongside. */
export function hireEscort() {
    if (S.prog.escorts >= MAX_ESCORTS || !pay(ESCORT_COST)) return;
    launchEscort(S.prog.escorts++);
    saveProgress();
}
