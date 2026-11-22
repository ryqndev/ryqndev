import { sfx } from '@ryqndev/rimefire-audio';
import { angDiff, damp, rnd, rnds, TAU } from '@ryqndev/rimefire-math';

import { fxFlame, fxIce, light, shake, spawn } from '../fx';
import { hud } from '../hud';
import { S } from '../state';
import { ARENA, height } from '../world';
import { hurtPlayer } from './damage';
import { drawBoss } from './draw';
import { moveFoe, shardAt, slamFx } from './foe-common';
import { hostXform } from './hit';
import { D, H } from './state';
import type { Foe } from './types';

export function updateBoss(e: Foe, dt: number, dist: number, ux: number, uz: number, tyaw: number, g: number) {
    const p = S.pl;
    e.y = g;
    for (const n of e.nodes) {
        n.fl = Math.max(0, (n.fl || 0) - dt * 5);
        n.sc = damp(n.sc, n.hp > 0 ? 1 : 0, 6, dt);
    }
    if (e.st === 9) {
        // rising out of the heart
        if (e.rise >= 0) {
            e.st = 0;
            hud.banner('THE COLOSSUS', 'shatter the frost nodes');
        }
        shake(0.12);
        if (Math.random() < dt * 30) fxIce(e.x + rnds(3), 0.5 + rnd(3), e.z + rnds(3), 2, 3);
    } else if (e.st === 5) {
        // stunned: core exposed
        moveFoe(e, dt, 0, 0, 4);
        e.arm = damp(e.arm, 0.5, 3, dt);
        e.kneel = damp(e.kneel || 0, 1, 4, dt);
        if (Math.random() < dt * 20) fxFlame(e.x + rnds(2), e.y + 4 + rnd(2.5), e.z + rnds(2), 1.6);
        if ((e.stun -= dt) <= 0) {
            e.st = 0;
            e.cycle++;
            for (const n of e.nodes) n.hp = 420;
            fxIce(e.x, e.y + 6.5, e.z, 4, 30);
            sfx.roar(e.x, e.y + 5, e.z);
            hud.banner('NODES REFORMING', '');
            for (let i = 0; i < 3 + e.cycle; i++) D.queue.push(0);
            if (e.cycle > 1) D.queue.push(1, 1);
        }
    } else {
        e.kneel = damp(e.kneel || 0, 0, 3, dt);
        const sp = dist > 11 ? e.sp * (1 + e.cycle * 0.15) : 0;
        if (e.st === 0) {
            moveFoe(e, dt, ux * sp, uz * sp, 2);
            e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 1.4);
            e.anim += dt * Math.hypot(e.vx, e.vz) * 0.75;
            e.arm = damp(e.arm, 0, 4, dt);
            e.vcd -= dt;
            e.scd -= dt;
            if (e.scd <= 0 || (dist < 10 && e.scd < 4)) {
                e.st = 1;
                e.t = 0;
                sfx.charge(e.x, e.y + 5, e.z);
            } else if (e.vcd <= 0) {
                e.st = 3;
                e.t = 0;
                e.n = 0;
                sfx.charge(e.x, e.y + 7, e.z);
            }
        } else if (e.st === 1) {
            moveFoe(e, dt, 0, 0, 4);
            e.arm = damp(e.arm, 2.8, 4, dt);
            if (e.t > 1.05) {
                e.st = 2;
                e.t = 0;
                e.hitP = false;
            }
        } else if (e.st === 2) {
            moveFoe(e, dt, 0, 0, 4);
            e.arm = damp(e.arm, 0.8, 26, dt);
            if (e.t > 0.1 && !e.hitP) {
                e.hitP = true;
                const sx = e.x - Math.sin(e.yaw) * 4.4,
                    sz = e.z - Math.cos(e.yaw) * 4.4;
                slamFx(sx, g, sz, 8, 30);
                e.ring = 0;
                e.rx = sx;
                e.rz = sz;
                e.ringHit = false;
            }
            if (e.t > 1.3) {
                e.st = 0;
                e.scd = rnd(6, 8) - e.cycle;
            }
        } else if (e.st === 3) {
            moveFoe(e, dt, ux * sp * 0.4, uz * sp * 0.4, 2);
            e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 2.5);
            e.charge = Math.min(1, e.t / 0.6);
            if (e.t > 0.65 + e.n * 0.16) {
                hostXform(e, rnds(1.5), 9.3, -1.7, H);
                shardAt(H.x, H.y, H.z, 34, 1.6, 12);
                if (++e.n >= 5 + e.cycle * 2) {
                    e.st = 0;
                    e.vcd = rnd(2.6, 3.8) - e.cycle * 0.4;
                    e.charge = 0;
                }
            }
        }
    }
    // travelling ground shockwave: jump it
    if (e.ring >= 0) {
        e.ring += dt * 15;
        const rr = e.ring;
        for (let i = 0; i < 5; i++) {
            const a = rnd(TAU),
                x = e.rx + Math.cos(a) * rr,
                z = e.rz + Math.sin(a) * rr;
            if (Math.hypot(x, z) < ARENA + 6) spawn(3, x, height(x, z) + 0.2, z, Math.cos(a) * 5, rnd(1, 3), Math.sin(a) * 5, rnd(0.3, 0.6), 0.6, 1.8, 0.6, 0.9, 1.4, 0.4, 0.6, 1, 0.5, 0.3, 2, 0);
        }
        spawn(4, e.rx, g + 0.12, e.rz, 0, 0, 0, 0.06, rr * 1.22, rr * 1.22, 1.2, 3, 5, 1.2, 3, 5, 0.6, 1);
        const pd = Math.hypot(p.x - e.rx, p.z - e.rz);
        if (!e.ringHit && Math.abs(pd - rr) < 0.9 && p.y - height(p.x, p.z) < 0.75) {
            e.ringHit = true;
            hurtPlayer(22, e.rx, e.rz);
            p.vy += 5;
        }
        if (rr > 34) e.ring = -1;
    }
    const exposed = e.st === 5 ? 1 : 0;
    light(e.x, e.y + 6 + e.rise, e.z, 22 * (0.4 + exposed * 2), 8 * (0.4 + exposed * 2), 2, 18);
    drawBoss(e);
}
