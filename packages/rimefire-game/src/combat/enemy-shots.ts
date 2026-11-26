import { clamp, m4aim, m4trs, rnd, rnds } from '@ryqndev/kiln-math';
import { sfx } from '@ryqndev/rimefire-audio';
import { addInstance } from '@ryqndev/rimefire-renderer';

import { addDebris, fxIce, fxPuff, light, shake, spawn, sprite } from '../fx';
import { M } from '../models';
import { S } from '../state';
import { segHit } from '../world';
import { hurtPlayer } from './damage';
import { segSphere } from './hit';
import { B, H, shots } from './state';

export function updateEnemyShots(dt: number) {
    const p = S.pl;
    for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (s.type === 1) s.vy -= 15 * dt;
        const nx = s.x + s.vx * dt,
            ny = s.y + s.vy * dt,
            nz = s.z + s.vz * dt;
        const tw = segHit(s.x, s.y, s.z, nx, ny, nz, H);
        const hitP = segSphere(s.x, s.y, s.z, nx - s.x, ny - s.y, nz - s.z, p.x, p.y + 1.25, p.z, 0.5) >= 0 || segSphere(s.x, s.y, s.z, nx - s.x, ny - s.y, nz - s.z, p.x, p.y + 0.55, p.z, 0.5) >= 0;
        if (s.type === 0) {
            if (hitP) {
                hurtPlayer(s.dmg, s.x - s.vx, s.z - s.vz);
                fxIce(nx, ny, nz, 0.8, 6);
                shots.splice(i, 1);
                continue;
            }
            if (tw >= 0 || (s.life -= dt) < 0) {
                fxIce(H.x, H.y, H.z, 0.8, 6);
                sfx.tick(H.x, H.y, H.z);
                shots.splice(i, 1);
                continue;
            }
            m4aim(B, nx, ny, nz, s.vx, s.vy, s.vz, 1);
            addInstance(M.shard, B, 1, 1, 1, 0, 2.2);
            light(nx, ny, nz, 1.5, 5, 8, 4);
            sprite(0, nx, ny, nz, 0.5, 0.6, 2, 3.2, 0.7);
            if (Math.random() < dt * 40) spawn(0, nx, ny, nz, 0, 0, 0, 0.3, 0.14, 0.02, 0.6, 2, 3, 0.2, 0.6, 1.2, 0.6, 1);
        } else {
            if (tw >= 0 || hitP || (s.life -= dt) < 0) {
                const x = tw >= 0 ? H.x : nx,
                    y = tw >= 0 ? H.y : ny,
                    z = tw >= 0 ? H.z : nz;
                fxIce(x, y + 0.2, z, 2, 18);
                fxPuff(x, y, z, 2, 6);
                sfx.shatter(x, y, z, 1.4);
                spawn(4, x, y + 0.1, z, 0, 0, 0, 0.35, 0.6, 6, 2, 5, 8, 0.4, 1, 2, 0.7, 1);
                const d = Math.hypot(p.x - x, p.y + 0.8 - y, p.z - z);
                shake(clamp(0.4 * (1 - d / 16), 0, 0.4));
                if (d < 2.9) hurtPlayer(s.dmg * (1 - (d / 2.9) * 0.6), x, z);
                for (let k = 0; k < 4; k++) addDebris(M.debA, x, y + 0.3, z, rnds(5), rnd(3, 7), rnds(5), rnd(0.8, 1.4), rnd(1, 2));
                shots.splice(i, 1);
                continue;
            }
            s.rot += dt * 5;
            m4trs(B, nx, ny, nz, s.rot, s.rot * 0.7, 0, 1);
            addInstance(M.boulder, B, 1, 1, 1, 0, 1.6);
            light(nx, ny, nz, 1, 3.5, 6, 5);
            // landing marker
        }
        s.x = nx;
        s.y = ny;
        s.z = nz;
    }
}
