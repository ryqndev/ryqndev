import { sfx } from '@ryqndev/rimefire-audio';
import { angDiff, clamp, damp, rnd, rnds } from '@ryqndev/rimefire-math';

import { fxFlame, light } from '../fx';
import { S } from '../state';
import { height, pushOut } from '../world';
import { updateBoss } from './boss';
import { hurtPlayer, kill } from './damage';
import { drawBulwark, drawLancer, drawSkitter } from './draw';
import { moveFoe, shardAt, slamFx } from './foe-common';
import { foes, shots } from './state';

export function updateFoes(dt: number) {
    const p = S.pl;
    for (let i = foes.length - 1; i >= 0; i--) {
        const e = foes[i];
        if (e.dead) {
            foes.splice(i, 1);
            continue;
        }
        if (e.hp <= 0) {
            kill(e);
            continue;
        }
        e.t += dt;
        e.flash = Math.max(0, e.flash - dt * 5);
        if (e.rise < 0) e.rise = Math.min(0, e.rise + dt * (e.type === 3 ? 2.6 : 2.2));
        if (e.burn > 0) {
            e.burn -= dt;
            if (e.type !== 3) e.hp -= 14 * dt;
            if (Math.random() < dt * 18) fxFlame(e.x + rnds(e.r * 0.6), e.y + (e.type === 2 ? 1.2 : 0.3) + rnd(0.5), e.z + rnds(e.r * 0.6), 0.5 + e.r * 0.4);
            light(e.x, e.y + 0.8, e.z, 7, 2.6, 0.6, 5);
        }
        const dx = p.x - e.x,
            dz = p.z - e.z,
            dist = Math.hypot(dx, dz) || 1,
            ux = dx / dist,
            uz = dz / dist;
        const tyaw = Math.atan2(-dx, -dz);
        if ((e.sft -= dt) < 0) {
            e.sft = rnd(2, 5);
            e.strafe = -e.strafe;
        }
        const g = height(e.x, e.z);

        if (e.type === 0) {
            // ---------------- skitter: flank, wind up, pounce
            if (e.st === 0) {
                const fl = dist > 5 ? 0.55 * e.strafe : 0;
                moveFoe(e, dt, (ux - uz * fl) * e.sp, (uz + ux * fl) * e.sp, 7);
                e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 9);
                e.anim += dt * (4 + Math.hypot(e.vx, e.vz) * 2.6);
                if (dist < 3.4 && e.cd <= 0 && e.rise >= 0 && Math.abs(p.y - e.y) < 2) {
                    e.st = 1;
                    e.t = 0;
                    sfx.chirp(e.x, e.y, e.z);
                }
            } else if (e.st === 1) {
                moveFoe(e, dt, 0, 0, 10);
                e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 12);
                e.pitch = -Math.min(1, e.t / 0.3) * 0.35;
                if (e.t > 0.32) {
                    e.st = 2;
                    e.t = 0;
                    const slow = 1 / (1 + e.goo * 1.3);
                    e.vx = ux * 13 * slow;
                    e.vz = uz * 13 * slow;
                    e.vy = 4.6 * slow;
                    e.air = true;
                    e.hitP = false;
                }
            } else if (e.st === 2) {
                e.x += e.vx * dt;
                e.z += e.vz * dt;
                pushOut(e, e.r, e.y + 0.4, e.y + 1.2);
                e.pitch = clamp(-e.vy * 0.08, -0.5, 0.5);
                if (!e.hitP && dist < 1.25 && Math.abs(p.y + 0.6 - e.y) < 1.5) {
                    e.hitP = true;
                    hurtPlayer(11, e.x, e.z);
                }
                if (!e.air) {
                    e.st = 3;
                    e.t = 0;
                    e.cd = rnd(0.9, 1.6);
                }
            } else {
                moveFoe(e, dt, 0, 0, 6);
                e.pitch *= 0.8;
                if (e.t > 0.45) e.st = 0;
            }
            e.cd -= dt;
            e.vy -= 20 * dt;
            e.y += e.vy * dt;
            if (e.y <= g) {
                e.y = g;
                e.vy = 0;
                e.air = false;
            }
            drawSkitter(e);
        } else if (e.type === 1) {
            // ---------------- lancer: orbit at range, telegraph, fire a shard
            const want = 15,
                rad = (dist - want) * 0.5;
            const grounded = e.goo > 1.15;
            let wx = (ux * clamp(rad, -1, 1) - uz * e.strafe * 0.75) * e.sp,
                wz = (uz * clamp(rad, -1, 1) + ux * e.strafe * 0.75) * e.sp;
            if (e.st === 1) {
                wx *= 0.15;
                wz *= 0.15;
            }
            moveFoe(e, dt, wx, wz, 2.5);
            const ty = g + (grounded ? 0.75 : Math.max(1.2, 3.7 - e.goo * 2.2)) + Math.sin(S.t * 1.7 + e.seed) * 0.25;
            e.y += (ty - e.y) * Math.min(1, dt * (grounded ? 5 : 2.2));
            e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 6);
            if (e.st === 0) {
                e.charge = Math.max(0, e.charge - dt * 3);
                if ((e.cd -= dt) <= 0 && dist < 36 && e.rise >= 0 && !grounded) {
                    e.st = 1;
                    e.t = 0;
                    sfx.charge(e.x, e.y, e.z);
                }
            } else {
                e.charge = Math.min(1, e.t / 0.75);
                if (e.t > 0.8) {
                    shardAt(e.x + ux * 0.6, e.y, e.z + uz * 0.6, 30, 0.5, 13);
                    e.st = 0;
                    e.cd = rnd(2.1, 3.3);
                    e.vx -= ux * 3;
                    e.vz -= uz * 3;
                }
            }
            if (e.charge > 0) light(e.x, e.y, e.z, 2 * e.charge, 7 * e.charge, 10 * e.charge, 6);
            drawLancer(e, ux, (p.y + 1.1 - e.y) / dist, uz);
        } else if (e.type === 2) {
            // ---------------- bulwark: advance, lob ice, ground slam
            e.y = g;
            if (e.st === 0) {
                moveFoe(e, dt, ux * e.sp, uz * e.sp, 3);
                e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 2.5);
                e.anim += dt * Math.hypot(e.vx, e.vz) * 1.5;
                e.arm = damp(e.arm, 0, 6, dt);
                e.cd -= dt;
                if (e.rise >= 0) {
                    if (dist < 4.4) {
                        e.st = 1;
                        e.t = 0;
                        sfx.charge(e.x, e.y + 2, e.z);
                    } else if (dist > 9 && dist < 44 && e.cd <= 0) {
                        e.st = 3;
                        e.t = 0;
                    }
                }
            } else if (e.st === 1) {
                moveFoe(e, dt, 0, 0, 6);
                e.arm = damp(e.arm, 2.9, 7, dt);
                if (e.t > 0.8) {
                    e.st = 2;
                    e.t = 0;
                }
            } else if (e.st === 2) {
                moveFoe(e, dt, 0, 0, 6);
                e.arm = damp(e.arm, 0.9, 30, dt);
                if (e.t > 0.09 && !e.hitP) {
                    e.hitP = true;
                    const sx = e.x - Math.sin(e.yaw) * 1.6,
                        sz = e.z - Math.cos(e.yaw) * 1.6;
                    slamFx(sx, g, sz, 5.4, 28);
                }
                if (e.t > 1.1) {
                    e.st = 0;
                    e.hitP = false;
                    e.cd = Math.max(e.cd, 1.5);
                }
            } else {
                moveFoe(e, dt, 0, 0, 6);
                e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 5);
                e.arm = damp(e.arm, e.t < 0.55 ? 2.6 : 0.6, e.t < 0.55 ? 7 : 22, dt);
                if (e.t > 0.6 && !e.hitP) {
                    e.hitP = true;
                    const T = dist / 17 + 0.45,
                        sx = e.x,
                        sy = e.y + 3,
                        sz = e.z;
                    shots.push({ type: 1, x: sx, y: sy, z: sz, vx: (p.x + p.vx * T * 0.5 - sx) / T, vy: (p.y - sy + 0.5 * 15 * T * T) / T, vz: (p.z + p.vz * T * 0.5 - sz) / T, life: 6, dmg: 20, rot: 0 });
                    sfx.shard(sx, sy, sz);
                }
                if (e.t > 1.0) {
                    e.st = 0;
                    e.hitP = false;
                    e.cd = rnd(4, 6);
                }
            }
            drawBulwark(e);
        } else updateBoss(e, dt, dist, ux, uz, tyaw, g);
    }
}
