import { sfx } from '@ryqndev/rimefire-audio';
import { clamp, rnd, rnds, TAU } from '@ryqndev/rimefire-math';

import { flash, fxIce, fxPuff, shake, spawn } from '../fx';
import { S } from '../state';
import { ARENA, height, pushOut } from '../world';
import { hurtPlayer } from './damage';
import { BS, NODEP, TY } from './defs';
import { foes, shots } from './state';
import type { Foe } from './types';

export function spawnFoe(type: number, x: number, z: number): Foe {
    const t = TY[type];
    const e: Foe = {
        type, x, y: height(x, z), z, vx: 0, vy: 0, vz: 0, yaw: Math.atan2(x - S.pl.x, z - S.pl.z), hp: t.hp, max: t.hp, r: t.r, sp: t.sp, mass: t.mass, br: t.br, hs: t.hs,
        st: 0, t: 0, flash: 0, burn: 0, goo: 0, rise: type === 3 ? -12 : -1.3, sc: type === 3 ? BS : 1, anim: rnd(TAU), dead: false, strafe: Math.random() < 0.5 ? -1 : 1, sft: rnd(2, 5),
        cd: rnd(1.5, 3), charge: 0, arm: 0, seed: rnd(100), hitP: false, air: false, wake: 0, pitch: 0,
        nodes: [], stun: 0, kneel: 0, vcd: 0, scd: 0, n: 0, cycle: 0, ring: -1, rx: 0, rz: 0, ringHit: false,
    };
    if (type === 1) e.y += 3.6;
    if (type === 3) {
        e.nodes = NODEP.map(() => ({ hp: 420, sc: 1, fl: 0 }));
        e.stun = 0;
        e.vcd = 4;
        e.scd = 7;
        e.ring = -1;
        e.cycle = 0;
        e.st = 9;
    }
    foes.push(e);
    fxIce(x, e.y + 0.3, z, type === 2 ? 1.6 : 1, 12);
    fxPuff(x, e.y, z, type === 2 ? 2 : 1.2, 5);
    sfx.shatter(x, e.y, z, 0.8);
    return e;
}

/** Steers toward a wanted velocity, separates from other enemies and resolves world collisions. */
export function moveFoe(e: Foe, dt: number, wx: number, wz: number, accel: number) {
    const slow = 1 / (1 + e.goo * (e.type === 2 ? 0.35 : e.type === 3 ? 0.05 : 1.3));
    const k = Math.min(1, accel * dt);
    e.vx += (wx * slow - e.vx) * k;
    e.vz += (wz * slow - e.vz) * k;
    // separation
    for (const o of foes) {
        if (o === e || o.dead) continue;
        const dx = e.x - o.x,
            dz = e.z - o.z,
            rr = e.r + o.r,
            d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-5 && Math.abs(e.y - o.y) < 2.5) {
            const d = Math.sqrt(d2),
                f = ((rr - d) / d) * (o.mass / (e.mass + o.mass)) * 0.6;
            e.x += dx * f;
            e.z += dz * f;
        }
    }
    e.x += e.vx * dt;
    e.z += e.vz * dt;
    if (e.type !== 3) pushOut(e, e.r, e.y + 0.4, e.y + 1.5);
    const r = Math.hypot(e.x, e.z);
    if (r > ARENA + 2) {
        e.x *= (ARENA + 2) / r;
        e.z *= (ARENA + 2) / r;
    }
}
/** Fires an ice shard from a point at the player, leading their movement. */
export function shardAt(x: number, y: number, z: number, speed: number, spread: number, dmg: number) {
    const p = S.pl,
        d = Math.hypot(p.x - x, p.y + 1.1 - y, p.z - z),
        T = d / speed;
    const dx = p.x + p.vx * T * 0.75 - x + rnds(spread),
        dy = p.y + 1.15 - y + rnds(spread * 0.5),
        dz = p.z + p.vz * T * 0.75 - z + rnds(spread);
    const l = Math.hypot(dx, dy, dz) || 1;
    shots.push({ type: 0, x, y, z, vx: (dx / l) * speed, vy: (dy / l) * speed, vz: (dz / l) * speed, life: 4, dmg, rot: 0 });
    sfx.shard(x, y, z);
}


/** Ground slam: effects plus an area hit the player can jump over. */
export function slamFx(x: number, y: number, z: number, r: number, dmg: number) {
    const p = S.pl;
    sfx.slam(x, y, z);
    spawn(4, x, y + 0.1, z, 0, 0, 0, 0.5, 1, r * 2.3, 2, 5, 8, 0.4, 1, 2, 0.8, 1);
    fxPuff(x, y, z, 3, 10);
    fxIce(x, y + 0.2, z, 1.5, 12);
    flash(x, y + 1, z, 8, 20, 34, 12, 0.3);
    S.stamps.push(x, z, 2.2, 0.25, 0);
    const d = Math.hypot(p.x - x, p.z - z);
    shake(clamp(0.7 * (1 - d / 30), 0, 0.7));
    if (d < r && p.y - height(p.x, p.z) < 1.0) {
        const f = 1 - (d / r) * 0.6;
        hurtPlayer(dmg * f, x, z);
        p.vx += ((p.x - x) / (d || 1)) * 10 * f;
        p.vz += ((p.z - z) / (d || 1)) * 10 * f;
        p.vy += 5.5 * f;
    }
}
