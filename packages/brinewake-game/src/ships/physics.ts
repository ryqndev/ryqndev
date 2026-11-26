import { sfx } from '@ryqndev/brinewake-audio';
import { cam, seaHeight, shoreCalm } from '@ryqndev/brinewake-renderer';
import { damp } from '@ryqndev/kiln-math';

import { fxFroth, fxSpray, shake, stampFoam } from '../fx';
import { S } from '../state';
import { height, SEA, W } from '../world';
import { hurtShip } from './damage';
import { ships } from './state';
import type { Ship } from './types';

/** How long a lost ship takes to go under, seconds. */
export const SINK_TIME = 9;
/** Everything solid in the home port lies within this many metres of the middle of the town. */
const HARBOUR = 260;
// spray is only worth simulating this close to the camera, metres squared
const SPRAY_RANGE2 = 260 * 260;

/** Advances one ship: canvas and helm to speed and heading, then the swell under her, grounding and her wake. */
export function sailShip(s: Ship, dt: number) {
    if (s.dead) {
        founder(s, dt);
        return;
    }
    s.canvas = damp(s.canvas, s.sail / 3, 1.2, dt);
    if (s.mend > 0 && s.hp < s.max) s.hp = Math.min(s.max, s.hp + s.mend * dt);
    // a holed ship is a slow ship
    const target = s.canvas * s.speed * (s.hp < s.max * 0.3 ? 0.8 : 1);
    s.v += (target - s.v) * (1 - Math.exp(-(target > s.v ? 0.3 : 0.5) * dt));
    // the rudder needs way on to bite, and a hard turn scrubs speed off
    const way = 0.3 + 0.7 * Math.min(1, Math.abs(s.v) / (s.speed * 0.5));
    s.w = damp(s.w, s.rudder * s.turn * way, 2.4, dt);
    s.yaw += s.w * dt;
    s.v *= 1 - Math.min(0.9, Math.abs(s.w) * 0.22) * dt;
    const fx = -Math.sin(s.yaw),
        fz = -Math.cos(s.yaw);
    s.x += fx * s.v * dt;
    s.z += fz * s.v * dt;

    // past the edge of the chart a current sets back toward the middle
    const r = Math.hypot(s.x, s.z);
    if (r > SEA) {
        const k = Math.min(1, (r - SEA) * 0.03) * 14 * dt;
        s.x -= (s.x / r) * k;
        s.z -= (s.z / r) * k;
    }

    // ---- aground: slide off down the slope of the bed, losing way and timber ----
    const keel = -s.hull.draft * s.scale * 0.7;
    s.ground -= dt;
    for (let k = -1; k <= 1; k++) {
        const px = s.x + fx * s.hl * 0.9 * k,
            pz = s.z + fz * s.hl * 0.9 * k,
            h = height(px, pz);
        if (h <= keel) continue;
        const gx = height(px + 2, pz) - height(px - 2, pz),
            gz = height(px, pz + 2) - height(px, pz - 2),
            gl = Math.hypot(gx, gz) || 1,
            push = Math.min(2, (h - keel) * 3) * Math.min(1, dt * 10);
        s.x -= (gx / gl) * push;
        s.z -= (gz / gl) * push;
        // only the player pays for it in timber: other captains are never lost to a navigation error
        if (s.role === 'player' && Math.abs(s.v) > 3.5 && s.ground <= 0) {
            s.ground = 0.8;
            hurtShip(s, Math.abs(s.v) * 0.9, false);
            shake(0.4);
            sfx.hit(s.x, 1, s.z);
        }
        s.v *= Math.max(0, 1 - 5 * dt);
    }

    // ---- piers, the slip and hulls at their moorings: shouldered off, and all way lost on them ----
    if ((s.x - W.port.tx) ** 2 + (s.z - W.port.tz) ** 2 < HARBOUR * HARBOUR)
        for (const o of W.solids)
            for (let k = -1; k <= 1; k++) {
                const ox = s.x + fx * s.hl * 0.62 * k - o[0],
                    oz = s.z + fz * s.hl * 0.62 * k - o[1],
                    d = Math.hypot(ox, oz),
                    reach = s.hb + o[2];
                if (d >= reach || d < 1e-3) continue;
                const push = (reach - d) * Math.min(1, dt * 8);
                s.x += (ox / d) * push;
                s.z += (oz / d) * push;
                s.v *= Math.max(0, 1 - 4 * dt);
            }

    // ---- attitude: ride the swell sampled at the bow, the stern and either beam ----
    const t = S.t,
        L = s.hl * 0.85,
        Bm = s.hb * 0.9,
        rx = Math.cos(s.yaw),
        rz = -Math.sin(s.yaw),
        calm = shoreCalm(height(s.x, s.z));
    const bow = seaHeight(s.x + fx * L, s.z + fz * L, t),
        aft = seaHeight(s.x - fx * L, s.z - fz * L, t),
        star = seaHeight(s.x + rx * Bm, s.z + rz * Bm, t),
        port = seaHeight(s.x - rx * Bm, s.z - rz * Bm, t);
    s.y = damp(s.y, (bow + aft + star + port) * 0.25 * calm, 5, dt);
    s.pitch = damp(s.pitch, Math.atan2((bow - aft) * calm, 2 * L), 3.5, dt);
    // she heels outward in a turn
    s.roll = damp(s.roll, Math.atan2((star - port) * calm, 2 * Bm) * 0.8 - s.w * 0.45 * Math.min(1, Math.abs(s.v) / s.speed + 0.2), 3, dt);

    // ---- wake: foam under the stern and at the cutwater, spray off the bow at speed ----
    const pace = Math.min(1, Math.abs(s.v) / 12);
    if ((s.wake += Math.abs(s.v) * dt) > 3.2) {
        s.wake = 0;
        stampFoam(s.x - fx * s.hl * 0.95, s.z - fz * s.hl * 0.95, s.hb * 1.3, 0.16 + 0.3 * pace);
        stampFoam(s.x + fx * s.hl * 0.6, s.z + fz * s.hl * 0.6, s.hb * 1.05, 0.06 + 0.16 * pace);
    }
    if (s.v > 7 && Math.random() < dt * s.v * 0.9 && (s.x - cam.x) ** 2 + (s.z - cam.z) ** 2 < SPRAY_RANGE2) {
        const side = Math.random() < 0.5 ? 1 : -1;
        fxSpray(s.x + fx * s.hl * 0.82 + rx * side * s.hb * 0.3, s.y + 0.4, s.z + fz * s.hl * 0.82 + rz * side * s.hb * 0.3, fx * s.v * 0.5 + rx * side * 3, fz * s.v * 0.5 + rz * side * 3, 0.6 + pace * 0.6);
    }
}

// a lost ship settles by the stern and rolls onto her side as she goes under
function founder(s: Ship, dt: number) {
    s.sink += dt;
    s.v *= Math.max(0, 1 - 1.2 * dt);
    s.w *= Math.max(0, 1 - 2 * dt);
    s.x -= Math.sin(s.yaw) * s.v * dt;
    s.z -= Math.cos(s.yaw) * s.v * dt;
    s.yaw += s.w * dt;
    const k = s.sink / SINK_TIME;
    s.y -= (0.25 + k * 2.6) * s.scale * dt;
    s.pitch += 0.055 * dt;
    s.roll += (s.seed > 50 ? 0.085 : -0.085) * dt;
    s.canvas = damp(s.canvas, 0.25, 0.6, dt);
    if (Math.random() < dt * 9) fxFroth(s.x, s.z, s.hl * 0.8);
}

/** Keeps hulls from passing through one another: overlapping ships are shouldered apart. */
export function collideShips(dt: number) {
    for (let i = 0; i < ships.length; i++) {
        const a = ships[i];
        if (a.dead) continue;
        for (let j = i + 1; j < ships.length; j++) {
            const b = ships[j];
            if (b.dead) continue;
            const reach = a.hl + b.hl;
            if ((a.x - b.x) ** 2 + (a.z - b.z) ** 2 > reach * reach) continue;
            // each hull as three circles strung along the keel
            const afx = -Math.sin(a.yaw),
                afz = -Math.cos(a.yaw),
                bfx = -Math.sin(b.yaw),
                bfz = -Math.cos(b.yaw),
                rr = a.hb + b.hb;
            for (let p = -1; p <= 1; p++)
                for (let q = -1; q <= 1; q++) {
                    const dx = a.x + afx * a.hl * 0.62 * p - (b.x + bfx * b.hl * 0.62 * q),
                        dz = a.z + afz * a.hl * 0.62 * p - (b.z + bfz * b.hl * 0.62 * q),
                        d = Math.hypot(dx, dz);
                    if (d >= rr || d < 1e-3) continue;
                    // the bigger ship gives less ground
                    const push = (rr - d) * Math.min(1, dt * 8),
                        share = b.hl / reach,
                        nx = dx / d,
                        nz = dz / d;
                    a.x += nx * push * share;
                    a.z += nz * push * share;
                    b.x -= nx * push * (1 - share);
                    b.z -= nz * push * (1 - share);
                    // ramming costs both hulls, but only when the player is one of them
                    const closing = Math.abs(a.v) + Math.abs(b.v);
                    if (closing > 9 && a.ground <= 0 && b.ground <= 0 && (a.role === 'player' || b.role === 'player')) {
                        a.ground = b.ground = 1;
                        hurtShip(a, closing * 0.5, a.role !== 'player');
                        hurtShip(b, closing * 0.5, b.role !== 'player');
                        sfx.hit((a.x + b.x) / 2, 1, (a.z + b.z) / 2);
                        shake(0.35);
                    }
                    a.v *= Math.max(0, 1 - 1.5 * dt);
                    b.v *= Math.max(0, 1 - 1.5 * dt);
                }
        }
    }
}
