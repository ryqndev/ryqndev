import { addInstance, env } from '@ryqndev/brinewake-renderer';
import { m4mul, m4trs } from '@ryqndev/rimefire-math';

import { fxBurn, light, sprite } from '../fx';
import { M } from '../models';
import { S } from '../state';
import { B, Lm, Tm } from './state';
import type { Ship } from './types';

/** Queues a ship for drawing: hull, each sail (as much of it as is set), her colours, and her lantern after dark. */
export function drawShip(s: Ship) {
    const h = s.hull,
        t = s.type,
        set = 0.1 + 0.9 * s.canvas;
    m4trs(B, s.x, s.y, s.z, s.yaw, s.pitch, s.roll, s.scale);
    addInstance(h.mesh, B, t.paint[0], t.paint[1], t.paint[2], s.flash);
    for (let i = 0; i < h.sails.length; i++) {
        const sl = h.sails[i];
        // furling draws the sail up to its yard
        m4trs(Lm, 0, sl.y, sl.z, 0, 0, 0, sl.w, sl.h * set, sl.w);
        m4mul(Tm, B, Lm);
        addInstance(M.sail, Tm, t.canvas[0], t.canvas[1], t.canvas[2], s.flash * 0.4);
    }
    m4trs(Lm, 0, h.flag[1], h.flag[2], 0, 0, 0, 2.4);
    m4mul(Tm, B, Lm);
    addInstance(M.flag, Tm, t.paint[0], t.paint[1], t.paint[2]);
    if (env.lamp > 0.05 && !s.dead) {
        const [lx, ly, lz] = h.lantern,
            x = B[0] * lx + B[4] * ly + B[8] * lz + B[12],
            y = B[1] * lx + B[5] * ly + B[9] * lz + B[13],
            z = B[2] * lx + B[6] * ly + B[10] * lz + B[14];
        sprite(0, x, y, z, 1.1 * env.lamp, 2.2, 1.3, 0.5, 0.8);
        light(x, y + 0.5, z, 7 * env.lamp, 4.2 * env.lamp, 1.7 * env.lamp, 22);
    }
}

/**
 * Fire on a ship that has taken a beating: the worse her state, the more of her deck is alight.
 * Returns how brightly she burns, for the crackle in the sound bed.
 */
export function burnShip(s: Ship, dt: number): number {
    const hurt = s.dead ? Math.max(0, 0.9 - s.sink * 0.22) : 1 - s.hp / (s.max * 0.5);
    if (hurt <= 0) return 0;
    const c = Math.cos(s.yaw),
        sn = Math.sin(s.yaw);
    // two or three seats of fire at fixed places along the deck
    const fires = hurt > 0.6 ? 3 : hurt > 0.3 ? 2 : 1;
    for (let i = 0; i < fires; i++) {
        const lz = Math.sin(s.seed * (i + 1) * 1.7) * s.hl * 0.6,
            lx = Math.cos(s.seed * (i + 2) * 2.3) * s.hb * 0.4,
            x = s.x + c * lx + sn * lz,
            z = s.z - sn * lx + c * lz,
            y = s.y + s.hull.deck * s.scale;
        if (Math.random() < dt * (10 + 22 * hurt)) fxBurn(x, y, z, 0.8 + hurt);
        if (i === 0) light(x, y + 2, z, 16 * hurt, 7 * hurt, 1.6 * hurt, 30 * (0.85 + 0.15 * Math.sin(S.t * 17 + s.seed)));
    }
    return hurt;
}
