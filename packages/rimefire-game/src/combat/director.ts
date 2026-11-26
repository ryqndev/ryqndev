import { PI, rnd, rnds } from '@ryqndev/kiln-math';
import { sfx } from '@ryqndev/rimefire-audio';

import { addDebris, flash, fxExplosion, shake } from '../fx';
import { M } from '../models';
import { S } from '../state';
import { W } from '../world';
import { spawnFoe } from './foe-common';
import { D, foes } from './state';

// enemy types per wave, in spawn order
const WAVES = [[0, 0, 0, 1, 0, 0, 1], [0, 0, 1, 0, 0, 2, 0, 1, 0, 1, 0], [0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 2, 0, 1]];
export function startWave() {
    D.queue.push(...WAVES[Math.min(2, D.lit - 1)]);
    D.wave = D.lit;
    D.qt = 1.5;
}
function spawnPoint() {
    const p = S.pl;
    let best = W.spawns[0],
        bs = -1;
    for (let i = 0; i < 6; i++) {
        const s = W.spawns[(Math.random() * W.spawns.length) | 0],
            d = Math.hypot(s[0] - p.x, s[1] - p.z);
        const sc = d > 16 && d < 60 ? 100 - Math.abs(d - 30) + rnd(10) : rnd(5);
        if (sc > bs) {
            bs = sc;
            best = s;
        }
    }
    return best;
}
/** Decides what spawns and when: waves after each pylon, an ambient trickle, then the boss. */
export function director(dt: number) {
    D.t += dt;
    const alive = foes.length;
    if (D.queue.length && (D.qt -= dt) <= 0 && alive < 9 + D.lit * 2) {
        const s = spawnPoint(),
            t = D.queue.shift()!;
        spawnFoe(t, s[0] + rnds(2), s[1] + rnds(2));
        D.qt = rnd(0.7, 1.5);
    }
    // ambient trickle so there is always something to coat
    if (!D.queue.length && !D.won && (D.amb -= dt) <= 0) {
        const cap = D.boss ? 2 : 2 + D.lit;
        if (alive < cap) {
            const s = spawnPoint();
            spawnFoe(D.lit > 0 && Math.random() < 0.3 ? 1 : 0, s[0] + rnds(2), s[1] + rnds(2));
        }
        D.amb = D.boss ? rnd(6, 9) : rnd(3.5, 6) - D.lit * 0.6;
    }
    // finale
    if (D.lit === 3 && !D.boss && !W.heart.awake) {
        D.bossT = D.bossT < 0 ? 0 : D.bossT + dt;
        if ((!D.queue.length && alive === 0 && D.bossT > 3) || D.bossT > 40) {
            W.heart.awake = true;
            W.heart.col.off = true;
            D.boss = spawnFoe(3, 0, 0);
            D.boss.yaw = Math.atan2(-S.pl.x, -S.pl.z) + PI;
            sfx.roar(0, 4, 0);
            for (let i = 0; i < 26; i++) addDebris(M.debA, rnds(3), rnd(1, 8), rnds(3), rnds(12), rnd(3, 12), rnds(12), rnd(1.5, 3.5), rnd(2, 4));
            flash(0, 5, 0, 20, 60, 100, 50, 1.5);
            shake(0.8);
            D.queue.length = 0;
        }
    }
    if (D.won) {
        D.bossT += dt;
        const b = D.boss!;
        if (D.bossT < 2.6 && Math.random() < dt * 9) {
            const x = b.x + rnds(3.5),
                y = b.y + rnd(1, 9),
                z = b.z + rnds(3.5);
            fxExplosion(x, y, z, rnd(1, 2));
            sfx.boom(x, y, z, 2);
            shake(0.3);
        }
    }
}
