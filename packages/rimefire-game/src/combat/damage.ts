import { sfx } from '@ryqndev/rimefire-audio';
import { rnd, rnds } from '@ryqndev/rimefire-math';

import { addDebris, flash, fxIce, shake } from '../fx';
import { hud } from '../hud';
import { M } from '../models';
import { S } from '../state';
import { NODEP } from './defs';
import { hostXform } from './hit';
import { D, foes, H } from './state';
import type { Foe } from './types';

export function hurtPlayer(d: number, sx?: number, sz?: number) {
    const p = S.pl;
    if (S.mode !== 'play' || p.hp <= 0 || p.god) return;
    p.hp -= d;
    p.hurtT = 0;
    S.dmgFx = Math.min(1, (S.dmgFx || 0) + d / 28 + 0.2);
    shake(0.18 + d / 80);
    sfx.hurt();
    if (sx !== undefined && sz !== undefined) hud.dmgDir(Math.atan2(sx - p.x, sz - p.z));
    if (p.hp <= 0) p.hp = 0;
}


/** Applies damage to an enemy. For the colossus, `node` routes it to a frost node; the core only takes full damage while stunned. */
export function damage(e: Foe, d: number, node: number, boom: boolean) {
    if (e.dead) return;
    if (e.type === 3) {
        if (e.st === 9) return;
        if (node >= 0 && e.nodes[node].hp > 0) {
            const nd = e.nodes[node];
            nd.hp -= d;
            nd.fl = 1;
            hud.hit(false);
            if (nd.hp <= 0) {
                hostXform(e, NODEP[node][0], NODEP[node][1], NODEP[node][2], H);
                fxIce(H.x, H.y, H.z, 2.4, 26);
                for (let i = 0; i < 9; i++) addDebris(M.debA, H.x, H.y, H.z, rnds(7), rnd(2, 9), rnds(7), rnd(1.4, 2.6), rnd(1.5, 3), 1, 1, 1, 1.5);
                sfx.shatter(H.x, H.y, H.z, 1.6);
                flash(H.x, H.y, H.z, 10, 30, 50, 14, 0.4);
                shake(0.3);
                hud.hit(true);
                if (e.nodes.every((n) => n.hp <= 0)) {
                    e.stun = 7.5;
                    e.st = 5;
                    e.t = 0;
                    hud.banner('CORE EXPOSED', 'pour it on');
                    sfx.roar(e.x, e.y + 5, e.z);
                }
            }
            return;
        }
        d *= e.stun > 0 ? 1 : 0.1;
    }
    e.hp -= d;
    e.flash = 1;
    if (boom) e.burn = Math.max(e.burn, 1.2);
    if (d > 3) hud.hit(false);
    if (e.hp <= 0) kill(e);
}
export function kill(e: Foe) {
    e.dead = true;
    S.stats.kills++;
    hud.hit(true);
    sfx.kill();
    const cy = e.y + (e.type === 2 ? 1.6 : e.type === 3 ? 6 : 0.4),
        s = [1, 1.2, 2, 4][e.type];
    fxIce(e.x, cy, e.z, s, 14 + e.type * 8);
    sfx.shatter(e.x, cy, e.z, s);
    const n = [6, 8, 14, 40][e.type];
    for (let i = 0; i < n; i++) addDebris(i % 4 === 3 ? M.debB : M.debA, e.x + rnds(e.r), cy + rnds(e.r), e.z + rnds(e.r), e.vx * 0.5 + rnds(6), rnd(2, 8) * (1 + s * 0.2), e.vz * 0.5 + rnds(6), rnd(0.7, 1.5) * (0.7 + s * 0.4), rnd(1.4, 3));
    if (e.type === 3) {
        D.won = true;
        D.bossT = 0;
        S.slowmo = 3;
        for (const o of foes) if (o !== e) o.hp = 0;
    }
}
