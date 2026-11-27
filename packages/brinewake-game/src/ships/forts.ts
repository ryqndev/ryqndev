// The king's forts: stone that shoots back. A fort fires on any pirate inside its reach, shrugs off
// most of what a ship's guns throw at it, and falls to shells and great guns; sacked, its treasury is on the water.
import { sfx } from '@ryqndev/brinewake-audio';
import { cam } from '@ryqndev/brinewake-renderer';
import { rnd, rnds } from '@ryqndev/kiln-math';

import { fxBurn, fxDust, fxExplosion, fxHit, shake } from '../fx';
import { hud } from '../hud';
import { NET } from '../net/role';
import { saveProgress } from '../save';
import { S } from '../state';
import { W } from '../world';
import { type Fort, forts, loot } from './state';
import { type GunStats, MOUNT, type Ship, SHOT, TEAM } from './types';

const WALLS = 1400,
    /** how far its guns reach, metres: inside a mortar's range, and outside most ships' guns */
    REACH = 235,
    /** guns in a salvo, and seconds between salvoes */
    SALVO = 4,
    RELOAD = 5.5,
    /** gold in its treasury, the renown for taking it, and how long it lies sacked, seconds */
    TREASURY = 3000,
    RENOWN = 10,
    REBUILD = 420;

/** What a fort's embrasures mount: heavy guns, well served, on a platform that does not roll. */
const GUN: GunStats = { kind: SHOT.ROUND, pellets: 1, dmg: 10, crew: 0, rig: 0, reload: RELOAD, shot: 71, spread: 0.06, heft: 1.25, stone: 0, mount: MOUNT.CARRIAGE };

/** Stands every fort up again, whole and garrisoned. */
export function resetForts() {
    forts.length = 0;
    for (const k of W.strongholds) forts.push({ name: k.name, x: k.x, z: k.z, r: k.r, top: k.top, hp: WALLS, max: WALLS, left: RELOAD, down: 0, spill: k.spill });
}

/** The standing fort whose walls a point lies within, or within `pad` metres of. */
export function fortAt(x: number, z: number, pad: number): Fort | null {
    for (const f of forts) if (f.down <= 0 && (x - f.x) ** 2 + (z - f.z) ** 2 < (f.r + pad) ** 2) return f;
    return null;
}

/** Shot striking a fort's walls at a point. `dmg` is what the stone takes: see GunStats.stone. */
export function hitFort(f: Fort, dmg: number, x: number, y: number, z: number, mine: boolean) {
    if (f.down > 0) return;
    fxDust(x, y, z);
    fxHit(x, y, z);
    if (NET.client) return;
    f.hp -= dmg;
    if (mine) hud.hit(f.hp <= 0);
    if (f.hp <= 0) sack(f);
}

// the walls are breached: the garrison runs, and what was in the treasury is thrown onto the water
/** A fort's walls coming down, as it looks and sounds. */
export function sackFx(f: Fort) {
    for (let i = 0; i < 4; i++) fxExplosion(f.x + rnds(f.r * 0.7), f.top - rnd(0, 5), f.z + rnds(f.r * 0.7), 1.2);
    sfx.sink(f.x, f.top, f.z);
    shake(Math.max(0.15, 0.7 - Math.hypot(f.x - cam.x, f.z - cam.z) / 500));
}

function sack(f: Fort) {
    f.hp = 0;
    f.down = REBUILD;
    sackFx(f);
    const chests = 10;
    for (let i = 0; i < chests; i++) loot.push({ x: f.spill[0] + rnds(16), z: f.spill[1] + rnds(16), vx: rnds(2), vz: rnds(2), value: TREASURY / chests, life: 260, seed: rnd(100), kind: i % 2 });
    S.prog.renown += RENOWN;
    hud.banner(f.name.toUpperCase() + ' HAS FALLEN', 'her treasury is on the water');
    // the banner may be taken at once by what the navy now calls the player: this stays
    hud.news(f.name + ' has fallen · her treasury is on the water');
    sfx.horn();
    saveProgress();
}

/**
 * Runs the forts: a standing one fires on the player inside its reach, laying off for her way; a
 * sacked one burns until its garrison comes back. `fire` throws one ball and `blast` is the gun
 * going off (see throwShot and muzzleBlast in cannons.ts).
 */
export function updateForts(dt: number, war: boolean, p: Ship, blast: (x: number, y: number, z: number, dx: number, dz: number, heft: number, loud: boolean) => void, fire: (gun: GunStats, x: number, y: number, z: number, tx: number, tz: number, team: number, credit: number) => unknown) {
    if (dt <= 0) return;
    for (const f of forts) {
        if (f.down > 0) {
            if (Math.random() < dt * 9) fxBurn(f.x + rnds(f.r * 0.6), f.top - rnd(0, 3), f.z + rnds(f.r * 0.6), 1.6);
            if ((f.down -= dt) <= 0) {
                f.down = 0;
                f.hp = f.max;
                f.left = RELOAD;
            }
            continue;
        }
        if (f.left > 0) f.left -= dt;
        const dx = p.x - f.x,
            dz = p.z - f.z,
            d = Math.hypot(dx, dz) || 1;
        if (!war || p.dead || d > REACH || f.left > 0) continue;
        f.left = RELOAD;
        const flight = d / (GUN.shot * 0.8),
            ax = p.x - Math.sin(p.yaw) * p.v * flight,
            az = p.z - Math.cos(p.yaw) * p.v * flight;
        for (let n = 0; n < SALVO; n++) {
            // the guns of the face that bears, a few paces apart along its wall
            const along = (n - (SALVO - 1) / 2) * 4.5,
                x = f.x + (dx / d) * (f.r - 4) - (dz / d) * along,
                z = f.z + (dz / d) * (f.r - 4) + (dx / d) * along;
            fire(GUN, x, f.top, z, ax, az, TEAM.NAVY, 0);
            // one report for the salvo, from the first of its guns
            blast(x, f.top, z, dx / d, dz / d, GUN.heft, n === 0);
        }
    }
}
