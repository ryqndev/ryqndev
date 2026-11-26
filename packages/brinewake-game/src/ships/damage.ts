import { sfx } from '@ryqndev/brinewake-audio';
import { cam } from '@ryqndev/brinewake-renderer';
import { rnd, rnds } from '@ryqndev/kiln-math';

import { addDebris, fxExplosion, fxHit, shake } from '../fx';
import { hud } from '../hud';
import { M } from '../models';
import { saveProgress } from '../save';
import { PL, S } from '../state';
import { ceaseFire } from './battery';
import { dropLoot } from './loot';
import { type Ship, TEAM } from './types';

/** A ball striking a hull at a point, travelling along (vx, vz). `mine` marks the player's own shot. */
export function hitShip(s: Ship, dmg: number, x: number, y: number, z: number, vx: number, vz: number, mine: boolean) {
    fxHit(x, y, z);
    sfx.hit(x, y, z);
    for (let i = 0; i < 2; i++) addDebris(M.plank, x, y, z, rnds(5) - vx * 0.03, rnd(3, 8), rnds(5) - vz * 0.03, rnd(0.5, 1), rnd(3, 6));
    if (s.role === 'player') hud.dmgDir(Math.atan2(vx, vz));
    hurtShip(s, dmg, mine);
}

/** Takes hull off a ship, from shot, rocks or a ramming; sinks her when it runs out. */
export function hurtShip(s: Ship, dmg: number, mine: boolean) {
    if (s.dead) return;
    if (s.role === 'player') {
        if (S.mode !== 'play' || PL.god) return;
        S.dmgFx = Math.min(1, S.dmgFx + dmg / 40 + 0.15);
        shake(0.12 + dmg / 60);
        sfx.hurt();
    }
    s.hp -= dmg;
    s.flash = 1;
    // remembers being fired on: merchantmen run, and the navy stops respecting the harbour
    if (s.team !== TEAM.PIRATE) s.aggro = 45;
    if (mine) hud.hit(s.hp <= 0);
    if (s.hp <= 0) sinkShip(s);
}

function sinkShip(s: Ship) {
    s.dead = true;
    s.hp = 0;
    s.sink = 0.001;
    ceaseFire(s);
    const size = s.hl / 9;
    fxExplosion(s.x, s.y + 2, s.z, 0.7 + size * 0.5);
    sfx.sink(s.x, 2, s.z);
    for (let i = 0; i < 12 + s.hl * 1.4; i++) addDebris(M.plank, s.x + rnds(s.hl * 0.7), s.y + rnd(1, 4), s.z + rnds(s.hl * 0.7), rnds(9), rnd(4, 15), rnds(9), rnd(0.7, 1.8), rnd(5, 12));
    const near = Math.hypot(s.x - cam.x, s.z - cam.z);
    shake(Math.max(0, 0.6 - near / 400));
    if (s.team !== TEAM.PIRATE) {
        S.prog.stats.sunk++;
        S.prog.renown += s.type.renown;
        dropLoot(s);
    } else if (s.role === 'escort') {
        S.prog.escorts = Math.max(0, S.prog.escorts - 1);
        hud.toast('A consort is lost with all hands');
        saveProgress();
    }
}
