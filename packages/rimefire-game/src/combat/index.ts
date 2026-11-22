import { S } from '../state';
import { W } from '../world';
import { updateBlobs } from './blobs';
import { director } from './director';
import { updateEnemyShots } from './enemy-shots';
import { updateFires } from './fires';
import { updateFoes } from './foes';
import { updatePylons } from './pylons';
import { blobs, bolts, D, fires, foes, gels, shots } from './state';
import { updateShots } from './weapons';

export { GEL_AIM_RANGE, lobVelocity } from './ballistics';
export { igniteAt } from './blobs';
export { hurtPlayer } from './damage';
export { spawnFoe } from './foe-common';
export { blobs, D, foes } from './state';
export type { Blob, BossNode, Director, Foe } from './types';
export { aimDist, fireGel, fireSpark } from './weapons';

export function resetCombat() {
    blobs.length = foes.length = gels.length = bolts.length = fires.length = shots.length = 0;
    Object.assign(D, { lit: 0, queue: [], qt: 0, amb: 3, t: 0, boss: null, bossT: -1, won: false, hint: 0, wave: 0 });
    for (const p of W.pylons) {
        p.lit = false;
        p.hp = W.PYHP;
        p.thaw = 0;
        p.glow = 0;
        p.col.r = 2.2;
    }
    W.heart.awake = false;
    W.heart.diss = 0;
    W.heart.col.off = false;
}


export function updateCombat(dt: number) {
    if (S.chainT > 0 && (S.chainT -= dt) <= 0) S.chain = 0;
    director(dt);
    updateShots(dt);
    updateFoes(dt);
    updateEnemyShots(dt);
    updateBlobs(dt);
    updateFires(dt);
    updatePylons(dt);
}
// title-screen / dead: keep scenery animating without game logic
export function idleCombat(dt: number) {
    updateBlobs(dt);
    updateFires(dt);
    updatePylons(dt);
}
