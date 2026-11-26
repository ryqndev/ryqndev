import { setListener, sfx } from '@ryqndev/brinewake-audio';
import { cam, seaHeight, setCamera } from '@ryqndev/brinewake-renderer';
import { keys, mouse, opts } from '@ryqndev/kiln-core';
import { clamp, damp, vnoise } from '@ryqndev/kiln-math';

import { shake, sprite } from './fx';
import { bearing, CLASSES, fireBroadside, gunsReady, makeShip, maxRange, TEAM } from './ships';
import { refit } from './shipyard';
import { PL, S } from './state';
import { height, W } from './world';

const FOV = 1,
    SPYGLASS_FOV = 0.36;

/** Puts a freshly fitted ship at anchor off the pier, bows to sea, and the camera on her quarter. */
export function spawnPlayer() {
    const s = makeShip('player', TEAM.PIRATE, CLASSES[S.prog.cls], W.port.x, W.port.z, W.port.yaw);
    refit(s);
    Object.assign(PL, { ship: s, camYaw: s.yaw + 0.5, camPitch: -0.2, dist: 1, zoom: 0, side: -1, canDock: false });
    return s;
}

/** Clear water between a berthed ship's side and the wharf's piles, metres. */
const FENDER = 0.9;

/**
 * Lays the player's ship alongside the wharf, where she lies while she is in port. Called with no
 * time step it puts her there at once; called every frame with one it holds her there, and eases
 * her off or in when the yard changes her beam under her.
 */
export function moor(dt?: number) {
    const s = PL.ship,
        b = W.port.berth,
        off = s.hb + FENDER,
        x = b.x + b.nx * off,
        z = b.z + b.nz * off;
    s.x = dt === undefined ? x : damp(s.x, x, 8, dt);
    s.z = dt === undefined ? z : damp(s.z, z, 8, dt);
    s.yaw = b.yaw;
    s.v = s.w = s.rudder = 0;
}

/** A key press that gives the ship an order. */
export function playerKey(code: string) {
    const s = PL.ship;
    if (code === 'KeyW' || code === 'ArrowUp') {
        if (s.sail < 3) sfx.sail(true);
        s.sail = Math.min(3, s.sail + 1);
    } else if (code === 'KeyS' || code === 'ArrowDown') {
        if (s.sail > 0) sfx.sail(false);
        s.sail = Math.max(0, s.sail - 1);
    }
}

/** Reads the controls: helm, look, the lay of the guns and the order to fire. Then places the camera. */
export function updatePlayer(dt: number) {
    const s = PL.ship;
    // ---- look: the spyglass steadies the hand ----
    const sens = opts.sens * (1 - 0.6 * PL.zoom);
    PL.camYaw -= mouse.dx * sens;
    PL.camPitch = clamp(PL.camPitch - mouse.dy * sens, -1.2, 0.3);
    PL.dist = clamp(PL.dist + mouse.wheel * 0.1, 0.6, 2.2);
    mouse.dx = mouse.dy = mouse.wheel = 0;
    PL.zoom = damp(PL.zoom, mouse.r ? 1 : 0, 9, dt);
    s.rudder = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    placeCamera(dt);

    // ---- guns: laid where the line of sight meets the sea, held inside their reach ----
    let ax = s.x + cam.fx * 1e4,
        az = s.z + cam.fz * 1e4;
    if (cam.fy < -0.01) {
        const t = cam.y / -cam.fy;
        ax = cam.x + cam.fx * t;
        az = cam.z + cam.fz * t;
    }
    // which battery bears depends only on the direction; how far it can be laid, on the guns in it
    PL.side = bearing(s, ax, az);
    const reach = maxRange(s.bat[Math.max(0, PL.side)].gun.shot),
        dx = ax - s.x,
        dz = az - s.z,
        d = Math.hypot(dx, dz) || 1,
        r = clamp(d, Math.min(28, reach), reach);
    PL.aimX = ax = s.x + (dx / d) * r;
    PL.aimZ = az = s.z + (dz / d) * r;
    if (PL.side >= 0) {
        // the fall of shot, marked on the water: bright when that battery is ready, dull while it reloads
        const ready = gunsReady(s, PL.side),
            y = seaHeight(ax, az, S.t) + 0.35,
            size = 4.5 + r * 0.035;
        if (ready) sprite(4, ax, y, az, size, 1.6, 1.3, 0.8, 0.9);
        else sprite(4, ax, y, az, size, 0.9, 0.25, 0.15, 0.6);
        if (mouse.l && fireBroadside(s, PL.side, ax, az)) {
            PL.fired++;
            shake(0.22);
        }
    }
    PL.canDock = Math.hypot(s.x - W.port.x, s.z - W.port.z) < W.port.r && Math.abs(s.v) < 7;
}

/** Orbit camera on the player's ship, steered by PL.camYaw / camPitch. */
export function placeCamera(dt: number) {
    const s = PL.ship,
        h = s.hull,
        cp = Math.cos(PL.camPitch),
        fx = -Math.sin(PL.camYaw) * cp,
        fy = Math.sin(PL.camPitch),
        fz = -Math.cos(PL.camYaw) * cp;
    // pivot partway up the rigging, so the line of sight clears the bulwarks on its way to the sea
    const pivot = (h.deck + h.flag[1] * 0.42) * s.scale,
        dist = (16 + s.hl * 2.2) * PL.dist * (1 - 0.3 * PL.zoom);
    const x = s.x - fx * dist,
        z = s.z - fz * dist;
    // keep the lens out of the sea and off the hills
    const y = Math.max(s.y * 0.4 + pivot - fy * dist, seaHeight(x, z, S.t) + 1.3, height(x, z) + 2);
    S.trauma = Math.max(0, S.trauma - dt * 1.4);
    const k = S.trauma * S.trauma,
        t = S.t * 22;
    setCamera(x, y, z, PL.camYaw + (vnoise(t, 1.3) - 0.5) * 0.05 * k, PL.camPitch + (vnoise(t, 7.7) - 0.5) * 0.04 * k, (vnoise(t, 4.1) - 0.5) * 0.05 * k, FOV + (SPYGLASS_FOV - FOV) * PL.zoom);
    setListener(cam.x, cam.y, cam.z, cam.rx, cam.rz);
}

/**
 * Slow circle around a point of interest: the title, the port and the end screens. `aside` slides
 * the whole view that many metres to the right, which leaves the subject left of centre.
 */
export function orbitCamera(x: number, y: number, z: number, radius: number, heightAbove: number, angle: number, aside = 0) {
    const cx = x + Math.sin(angle) * radius + Math.cos(angle) * aside,
        cz = z + Math.cos(angle) * radius - Math.sin(angle) * aside,
        cy = Math.max(y + heightAbove, height(cx, cz) + 3);
    setCamera(cx, cy, cz, angle, -Math.atan2(cy - y, radius), 0, FOV);
    setListener(cam.x, cam.y, cam.z, cam.rx, cam.rz);
}
