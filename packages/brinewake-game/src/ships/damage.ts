import { sfx } from '@ryqndev/brinewake-audio';
import { cam } from '@ryqndev/brinewake-renderer';
import { rnd, rnds } from '@ryqndev/kiln-math';

import { addDebris, fxExplosion, fxHit, shake } from '../fx';
import { hud } from '../hud';
import { M } from '../models';
import { NET } from '../net/role';
import { saveProgress } from '../save';
import { holdCap } from '../shipyard';
import { live, PL, S } from '../state';
import { ceaseFire } from './battery';
import { dropLoot } from './loot';
import { type Ship, TEAM } from './types';

/** How much more a prize brought in whole is worth than the same ship's cargo fished out of the sea. */
const PRIZE = 1.6;
/** Seconds a harpoon's line holds before it chafes through. */
const HOLD = 12;

/**
 * A ball striking a hull at a point, travelling along (vx, vz). `mine` marks the player's own shot.
 * `crew` and `rig` are what it does to the hands on her deck and to her sails, measured like hull damage.
 */
export function hitShip(s: Ship, dmg: number, x: number, y: number, z: number, vx: number, vz: number, mine: boolean, crew = 0, rig = 0) {
    fxHit(x, y, z);
    sfx.hit(x, y, z);
    // shot that goes for the people or the sails leaves the timber where it is
    if (dmg > 2) for (let i = 0; i < 2; i++) addDebris(M.plank, x, y, z, rnds(5) - vx * 0.03, rnd(3, 8), rnds(5) - vz * 0.03, rnd(0.5, 1), rnd(3, 6));
    if (s.role === 'player') hud.dmgDir(Math.atan2(vx, vz));
    hurtShip(s, dmg, mine);
    // anywhere but the host the ball is only a picture of one: what it did is the host's to say
    if (s.dead || NET.client) return;
    if (rig) s.rig = Math.max(0, s.rig - rig / s.max);
    if (crew) thin(s, crew / s.max);
}

// Takes hands off a ship's deck. A merchantman or a king's ship with nobody left to fight her
// strikes her colours; the flagship never does, and a pirate's own company is not counted this way.
function thin(s: Ship, part: number) {
    if (s.team === TEAM.PIRATE || s.struck) return;
    s.crew = Math.max(s.role === 'flagship' ? 0.35 : 0, s.crew - part);
    if (s.crew > 0) return;
    s.struck = true;
    s.want = s.sail = 0;
    ceaseFire(s);
    sfx.bell();
    hud.news(s.type.name + ' strikes her colours · come alongside to take her');
}

/** A harpoon holding in a hull: she is on a line to the ship that threw it until it parts. */
export function snare(s: Ship, holder: Ship) {
    if (s.dead || s === holder || NET.client) return;
    if (s.snare <= 0 && holder.role === 'player') hud.news('Fast to the ' + s.type.name);
    s.snare = HOLD;
    s.holder = holder;
}

/**
 * Takes a ship that has struck, once the player lies alongside her: her whole cargo comes aboard
 * (what the hold cannot take is left afloat), and she is scuttled.
 */
export function takePrize(s: Ship) {
    if (s.dead || !s.struck) return;
    const value = Math.round(s.loot * PRIZE),
        aboard = Math.min(value, Math.max(0, holdCap() - S.hold)),
        left = value - aboard;
    S.hold += aboard;
    S.prog.renown += s.type.renown;
    S.prog.stats.sunk++;
    hud.banner('PRIZE TAKEN', aboard + ' gold out of her hold' + (left ? ' · ' + left + ' left afloat' : ''));
    sfx.coin();
    s.loot = left;
    if (left) dropLoot(s);
    s.dead = true;
    s.hp = 0;
    s.sink = 0.001;
    s.snare = 0;
}

/** Takes hull off a ship, from shot, rocks or a ramming; sinks her when it runs out. */
export function hurtShip(s: Ship, dmg: number, mine: boolean) {
    if (s.dead) return;
    if (s.role === 'player') {
        if (!live() || PL.god) return;
        S.dmgFx = Math.min(1, S.dmgFx + dmg / 40 + 0.15);
        shake(0.12 + dmg / 60);
        sfx.hurt();
    }
    s.flash = 1;
    if (NET.client) return;
    s.hp -= dmg;
    // remembers being fired on: merchantmen run, and the navy stops respecting the harbour
    if (s.team !== TEAM.PIRATE) s.aggro = 45;
    if (mine) hud.hit(s.hp <= 0);
    if (s.hp <= 0) sinkShip(s);
}

/** A ship going down, as it looks and sounds: the blast, the timber thrown up, the shock of it nearby. */
export function sinkFx(s: Ship) {
    const size = s.hl / 9;
    fxExplosion(s.x, s.y + 2, s.z, 0.7 + size * 0.5);
    sfx.sink(s.x, 2, s.z);
    for (let i = 0; i < 12 + s.hl * 1.4; i++) addDebris(M.plank, s.x + rnds(s.hl * 0.7), s.y + rnd(1, 4), s.z + rnds(s.hl * 0.7), rnds(9), rnd(4, 15), rnds(9), rnd(0.7, 1.8), rnd(5, 12));
    const near = Math.hypot(s.x - cam.x, s.z - cam.z);
    shake(Math.max(0, 0.6 - near / 400));
}

function sinkShip(s: Ship) {
    s.dead = true;
    s.snare = 0;
    s.hp = 0;
    s.sink = 0.001;
    ceaseFire(s);
    sinkFx(s);
    if (s.team !== TEAM.PIRATE) {
        S.prog.stats.sunk++;
        S.prog.renown += s.type.renown;
        dropLoot(s);
    } else if (s.role === 'escort') {
        S.prog.escorts = Math.max(0, S.prog.escorts - 1);
        hud.news('A consort is lost with all hands');
        saveProgress();
    }
}
