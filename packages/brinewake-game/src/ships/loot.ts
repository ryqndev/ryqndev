import { sfx } from '@ryqndev/brinewake-audio';
import { addInstance, seaHeight } from '@ryqndev/brinewake-renderer';
import { clamp, m4trs, rnd, rnds } from '@ryqndev/kiln-math';

import { spawn, sprite } from '../fx';
import { hud } from '../hud';
import { M } from '../models';
import { holdCap } from '../shipyard';
import { S } from '../state';
import { B, loot } from './state';
import type { Ship } from './types';

/** How far outside a hull plunder starts drifting toward it, metres. */
const HAUL = 18;

/** Spills a sunk ship's cargo onto the sea. */
export function dropLoot(s: Ship) {
    const n = clamp(Math.round(s.loot / 75), 2, 8);
    for (let i = 0; i < n; i++) loot.push({ x: s.x + rnds(s.hl), z: s.z + rnds(s.hl), vx: rnds(3.5), vz: rnds(3.5), value: Math.round(s.loot / n), life: 150, seed: rnd(100), kind: i % 3 === 0 ? 1 : 0 });
}

/** Drifts and draws the plunder afloat. With `p` given, that ship hauls aboard whatever it reaches. */
export function updateLoot(dt: number, p: Ship | null) {
    const cap = holdCap();
    for (let i = loot.length - 1; i >= 0; i--) {
        const l = loot[i];
        if ((l.life -= dt) <= 0) {
            loot.splice(i, 1);
            continue;
        }
        const drag = Math.max(0, 1 - 0.8 * dt);
        l.vx *= drag;
        l.vz *= drag;
        if (p && !p.dead) {
            const dx = p.x - l.x,
                dz = p.z - l.z,
                d = Math.hypot(dx, dz) || 1,
                reach = p.hl + 3;
            if (d < reach) {
                if (S.hold < cap) {
                    S.hold = Math.min(cap, S.hold + l.value);
                    sfx.coin();
                    for (let k = 0; k < 6; k++) spawn(2, l.x, 1, l.z, rnds(3), rnd(4, 9), rnds(3), rnd(0.4, 0.8), 0.05, 0.02, 9, 6.5, 1.5, 6, 3, 0.4, 1, 1, 0.6, 10, 0.03);
                    loot.splice(i, 1);
                    continue;
                }
                hud.tip('full', 2.5);
            } else if (d < reach + HAUL && S.hold < cap) {
                l.vx += (dx / d) * 26 * dt;
                l.vz += (dz / d) * 26 * dt;
            }
        }
        l.x += l.vx * dt;
        l.z += l.vz * dt;
        // riding the swell, tumbling a little, and slipping under when its time is up
        const y = seaHeight(l.x, l.z, S.t) + 0.15 - Math.max(0, 3 - l.life) * 0.5;
        m4trs(B, l.x, y, l.z, l.seed + S.t * 0.2, Math.sin(S.t * 1.3 + l.seed) * 0.16, Math.cos(S.t * 1.1 + l.seed) * 0.16, 1.15);
        addInstance(l.kind ? M.barrel : M.crate, B);
        // a glint, so plunder can be picked out against the water
        sprite(0, l.x, y + 1.7, l.z, 0.9 + 0.3 * Math.sin(S.t * 4 + l.seed), 1.5, 1.05, 0.3, 0.55);
    }
}
