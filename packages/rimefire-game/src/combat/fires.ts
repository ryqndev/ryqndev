import { rnd, rnds } from '@ryqndev/rimefire-math';

import { fxFlame, light } from '../fx';
import { S } from '../state';
import { igniteBlob } from './blobs';
import { hurtPlayer } from './damage';
import { blobs, fires, foes } from './state';

/** Burning ground left by detonations: lights nearby gel, burns enemies and the player. */
export function updateFires(dt: number) {
    const p = S.pl;
    let near = 0;
    for (let i = fires.length - 1; i >= 0; i--) {
        const f = fires[i];
        if ((f.life -= dt) <= 0) {
            fires.splice(i, 1);
            continue;
        }
        const k = Math.min(1, f.life / 0.8);
        if (Math.random() < dt * 22 * k) fxFlame(f.x + rnds(f.r * 0.5), f.y, f.z + rnds(f.r * 0.5), (0.7 + f.r * 0.5) * (0.5 + 0.5 * k));
        light(f.x, f.y + 0.7, f.z, 11 * k * (0.8 + 0.4 * Math.random()), 4.2 * k, 0.9 * k, 6 + f.r);
        const pd = Math.hypot(p.x - f.x, p.z - f.z);
        near += k / (1 + pd * pd * 0.02);
        if (pd < f.r && Math.abs(p.y - f.y) < 1.5) hurtPlayer(9 * dt, f.x, f.z);
        if ((f.t += dt) > 0.12) {
            f.t = 0;
            for (const b of blobs) if (b.heat === 0 && Math.hypot(b.x - f.x, b.y - f.y, b.z - f.z) < f.r + b.size) igniteBlob(b, rnd(0.12, 0.3));
            for (const e of foes) if (!e.dead && e.type !== 3 && Math.hypot(e.x - f.x, e.z - f.z) < f.r + e.r * 0.6 && Math.abs(e.y - f.y) < 2) e.burn = Math.max(e.burn, 0.5);
        }
    }
    S.fire = near;
}
