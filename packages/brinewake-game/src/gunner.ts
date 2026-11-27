// A player serving one gun, in a crew. He walks up to any gun on the upper deck that nobody else
// has and takes it with E; from then on the mouse trains it, as far as its port allows, and lays it
// where his line of sight meets the sea, and the button fires it. E again leaves it where it is.
import { setListener } from '@ryqndev/brinewake-audio';
import { cam, seaHeight, setCamera } from '@ryqndev/brinewake-renderer';
import { mouse, opts } from '@ryqndev/kiln-core';
import { clamp, damp, vnoise } from '@ryqndev/kiln-math';

import { settle, stand } from './afoot';
import { deck, deckAt, fromShip, trim } from './deck';
import { shake, sprite } from './fx';
import { NET } from './net/role';
import { gunManned } from './posts';
import { gunLoaded, maxRange, MOUNT, muzzleOf, serveGun, type Ship, spendGun, TRAIN } from './ships';
import { ON, PL, S } from './state';
import { height } from './world';

/** How near a gun's breech he must stand to take it, metres. */
const REACH = 1.7;
/** How far inboard of her side whoever serves a gun stands, by how it is mounted (see MOUNT), metres. */
const STAND_OFF = [1.95, 0.95, 1.7, 2, 2.7];
/** The camera over his shoulder: how far behind him and how far above his feet, metres. */
const BEHIND = 4.4,
    ABOVE = 4.3;
const FOV = 1,
    SPYGLASS_FOV = 0.36;

/** Where on her deck whoever serves gun `i` of a battery stands, in her own frame. The same object is handed back every time. */
export function gunSpot(s: Ship, side: number, i: number) {
    const sg = side ? 1 : -1,
        lz = s.hull.muzzles[side][i][2] * s.scale;
    deckAt(s, lz, true);
    spot.lz = lz;
    // on a narrow hull he may have to stand at her centreline, but never beyond it
    spot.lx = sg * Math.max(0.05, deck.w * s.scale - (STAND_OFF[s.bat[side].gun.mount] ?? STAND_OFF[MOUNT.CARRIAGE]));
    return spot;
}
const spot = { lx: 0, lz: 0 };

/**
 * Whether gun `i` of a battery is one a player can serve: it stands on her open deck. The guns
 * under her quarterdeck, in her cabin, are her own hands' to fight; so are any on a deck below.
 */
export const servable = (s: Ship, side: number, i: number) => i >= s.hull.inside[side] && i < s.hull.posts[side];

/** The heading of a line of sight straight out over a battery's side. */
export const beamYaw = (s: Ship, side: number) => s.yaw + (side ? -1 : 1) * (Math.PI / 2);

const near = { side: 0, gun: 0 };
/** The nearest gun to him that nobody is serving, if he is on deck and within reach of one. The same object is handed back every time. */
export function gunNear(): typeof near | null {
    const me = PL.me,
        s = PL.ship;
    // only from her weather deck: the guns under it are her own hands' to fight
    if (!NET.on || !PL.afoot || PL.gun >= 0 || me.on !== ON.DECK || me.air || me.below || me.tier > 0 || me.flight >= 0 || s.dead) return null;
    let best = REACH * REACH,
        found = false;
    for (let side = 0; side < 2; side++)
        for (let i = s.hull.inside[side]; i < s.hull.posts[side]; i++) {
            const p = gunSpot(s, side, i),
                d = (p.lx - me.lx) ** 2 + (p.lz - me.lz) ** 2;
            if (d >= best || gunManned(side, i)) continue;
            best = d;
            near.side = side;
            near.gun = i;
            found = true;
        }
    return found ? near : null;
}

/** E beside a gun: he takes the nearest one that is free. False if there is none within reach. */
export function manGun(): boolean {
    const g = gunNear();
    if (!g) return false;
    PL.gun = g.gun;
    PL.gunSide = g.side;
    PL.train = 0;
    PL.camPitch = -0.12;
    PL.dist = 1;
    PL.zoom = 0;
    mouse.l = false;
    return true;
}

/** He steps back from the gun he was serving, and is on his feet beside it. */
export function leaveGun() {
    if (PL.gun < 0) return;
    const s = PL.ship;
    PL.gun = -1;
    PL.side = -1;
    PL.zoom = 0;
    mouse.l = mouse.r = false;
    settle(beamYaw(s, PL.gunSide));
    PL.camYaw = PL.me.yaw;
    PL.camPitch = -0.25;
    PL.dist = 1;
}

/** Reads the controls for a player at a gun: trains and lays it, fires it, and places the camera over his shoulder. */
export function updateGunner(dt: number, fire: (side: number, gun: number, tx: number, tz: number) => void) {
    const s = PL.ship,
        side = PL.gunSide,
        i = PL.gun;
    // the gun he had is gone: his ship was lost, or rebuilt with fewer of them
    if (s.dead || !servable(s, side, i)) {
        leaveGun();
        return;
    }
    // ---- he stands to his gun, wherever she takes it ----
    const p = gunSpot(s, side, i);
    stand(p.lx, p.lz);
    PL.me.speed = 0;

    // ---- look: the gun follows his eye, as far as it will train; the spyglass steadies the hand ----
    const sens = opts.sens * (1 - 0.6 * PL.zoom);
    PL.train = clamp(PL.train - mouse.dx * sens, -TRAIN, TRAIN);
    PL.camPitch = clamp(PL.camPitch - mouse.dy * sens, -1.1, 0.25);
    PL.dist = clamp(PL.dist + mouse.wheel * 0.1, 0.6, 1.8);
    mouse.dx = mouse.dy = mouse.wheel = 0;
    PL.zoom = damp(PL.zoom, mouse.r ? 1 : 0, 9, dt);
    PL.camYaw = PL.me.yaw = beamYaw(s, side) + PL.train;
    PL.side = side;
    gunnerCamera(dt);

    // ---- the gun: laid where his line of sight meets the sea, held inside its reach ----
    const m = muzzleOf(s, side, i),
        mx = m.x,
        mz = m.z;
    let ax = mx + cam.fx * 1e4,
        az = mz + cam.fz * 1e4;
    if (cam.fy < -0.01) {
        const t = cam.y / -cam.fy;
        ax = cam.x + cam.fx * t;
        az = cam.z + cam.fz * t;
    }
    const b = s.bat[side],
        reach = maxRange(b.gun.shot),
        dx = ax - mx,
        dz = az - mz,
        d = Math.hypot(dx, dz) || 1,
        r = clamp(d, Math.min(28, reach), reach);
    PL.aimX = ax = mx + (dx / d) * r;
    PL.aimZ = az = mz + (dz / d) * r;
    // the fall of his shot, marked on the water: bright when the gun is loaded, dull while it is not
    const ready = gunLoaded(b, i),
        y = seaHeight(ax, az, S.t) + 0.35,
        size = 3 + r * 0.03;
    if (ready) sprite(4, ax, y, az, size, 1.6, 1.3, 0.8, 0.9);
    else sprite(4, ax, y, az, size, 0.9, 0.25, 0.15, 0.6);
    if (mouse.l && ready && !s.struck) {
        if (NET.client) {
            // the host fires it: until it says so, this gun is taken to be reloading, so that it is asked only once
            spendGun(s, side, i);
            fire(side, i, ax, az);
        } else serveGun(s, side, i, ax, az, NET.me);
        PL.fired++;
        shake(0.16);
    }
}

/** The camera over the shoulder of a player at a gun, looking where the gun is laid. */
export function gunnerCamera(dt: number) {
    const me = PL.me,
        s = PL.ship;
    trim(s);
    const cp = Math.cos(PL.camPitch),
        fx = -Math.sin(PL.camYaw) * cp,
        fy = Math.sin(PL.camPitch),
        fz = -Math.cos(PL.camYaw) * cp,
        back = BEHIND * PL.dist * (1 - 0.3 * PL.zoom),
        // from over her centreline rather than over his own head, so that her bulwark and the gun are in the picture
        over = fromShip(s, me.lx * 0.55, me.lz),
        x = over.x - fx * back,
        z = over.z - fz * back,
        y = Math.max(me.y + ABOVE * PL.dist - fy * back, seaHeight(x, z, S.t) + 1, height(x, z) + 1);
    S.trauma = Math.max(0, S.trauma - dt * 1.4);
    const k = S.trauma * S.trauma,
        t = S.t * 22;
    setCamera(x, y, z, PL.camYaw + (vnoise(t, 1.3) - 0.5) * 0.04 * k, PL.camPitch + (vnoise(t, 7.7) - 0.5) * 0.03 * k, (vnoise(t, 4.1) - 0.5) * 0.04 * k, FOV + (SPYGLASS_FOV - FOV) * PL.zoom);
    setListener(cam.x, cam.y, cam.z, cam.rx, cam.rz);
}
