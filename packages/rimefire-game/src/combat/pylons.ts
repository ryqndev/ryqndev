import { sfx } from '@ryqndev/rimefire-audio';
import { damp, m4trs, rnd, rnds } from '@ryqndev/rimefire-math';
import { addInstance } from '@ryqndev/rimefire-renderer';

import { addDebris, flash, fxIce, light, shake, spawn, sprite } from '../fx';
import { hud } from '../hud';
import { M } from '../models';
import { S } from '../state';
import { W } from '../world';
import { startWave } from './director';
import { B, D } from './state';

/** Pylon thaw/ignite logic and the frozen heart at the hub. */
export function updatePylons(dt: number) {
    for (const q of W.pylons) {
        q.hitT = Math.max(0, (q.hitT || 0) - dt * 3);
        if (!q.lit && q.hp <= 0) {
            q.lit = true;
            D.lit++;
            q.col.r = 1.3;
            for (let i = 0; i < 5; i++) fxIce(q.x + rnds(1.5), q.y + 1 + i * 1.4, q.z + rnds(1.5), 2.4, 16);
            for (let i = 0; i < 22; i++) addDebris(M.debA, q.x + rnds(1.6), q.y + rnd(0.5, 7), q.z + rnds(1.6), rnds(8), rnd(1, 9), rnds(8), rnd(1.2, 2.8), rnd(1.5, 3.5));
            sfx.shatter(q.x, q.y + 3, q.z, 1.8);
            sfx.pylon(q.x, q.y + 4, q.z);
            flash(q.x, q.y + 5, q.z, 90, 45, 14, 40, 1.2);
            shake(0.45);
            S.stamps.push(q.x, q.z, 7, 0.3, 0.5);
            S.pl.hp = Math.min(100, S.pl.hp + 40);
            hud.banner('PYLON ' + D.lit + ' / 3 REIGNITED', D.lit < 3 ? 'the frost is stirring' : 'something beneath the ice is waking');
            startWave();
        }
        if (q.lit) {
            q.thaw = Math.min(1.1, q.thaw + dt * 1.1);
            q.glow = damp(q.glow, 1, 1.5, dt);
            const fk = 0.85 + 0.15 * Math.sin(S.t * 9 + q.k) + 0.1 * Math.sin(S.t * 23 + q.k * 3);
            light(q.x, q.y + 5.2, q.z, 30 * q.glow * fk, 13 * q.glow * fk, 3.6 * q.glow, 25);
            sprite(0, q.x, q.y + 7.75, q.z, 2.6, 1.3 * q.glow * fk, 0.55 * q.glow * fk, 0.14 * q.glow, 1);
            if (Math.random() < dt * 9) spawn(2, q.x + rnds(0.5), q.y + 8, q.z + rnds(0.5), rnds(1.5), rnd(1.5, 4), rnds(1.5), rnd(0.8, 1.8), 0.02, 0.008, 12, 6, 1.5, 5, 1, 0.1, 1, 1, 0.5, 1.5, 0.02);
        } else q.thaw = (1 - Math.max(0, q.hp) / W.PYHP) * 0.42;
        m4trs(B, q.x, q.y, q.z, q.k, 0, 0, 1);
        const c = 0.3 + 0.7 * q.glow;
        addInstance(M.pyCoil, B, c, c, c, 0, q.glow * (1 + 0.12 * Math.sin(S.t * 11 + q.k)));
        if (q.thaw < 1.08) addInstance(M.pyIce, B, 1, 1, 1, q.hitT * 0.5, 1 + q.hitT * 3, q.thaw);
    }
    const h = W.heart;
    if (h.awake) h.diss = Math.min(1.1, (h.diss || 0) + dt * 0.45);
    if ((h.diss || 0) < 1.08) {
        m4trs(B, 0, 0.1, 0, 0.4, 0, 0, 1);
        const pulse = 0.6 + 0.4 * Math.sin(S.t * (1.2 + D.lit * 0.8));
        addInstance(M.heartIce, B, 1, 1, 1, 0, 0.5 + pulse * (0.6 + D.lit * 0.9), h.diss || 0);
        light(0, 3.5, 0, 0.6 * pulse * (1 + D.lit), 2.2 * pulse * (1 + D.lit), 3.4 * pulse * (1 + D.lit), 13);
    }
}
