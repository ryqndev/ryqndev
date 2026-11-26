import { m4 } from '@ryqndev/kiln-math';
import { GOO_CAPACITY, GOO_STRIDE } from '@ryqndev/rimefire-renderer';

import type { Hit } from '../world';
import type { Blob, Bolt, Director, EnemyShot, Fire, Foe, Gel } from './types';

// Live entities. Plain arrays mutated in place: the simulation is a module singleton.
export const blobs: Blob[] = [],
    foes: Foe[] = [];
export const gels: Gel[] = [],
    bolts: Bolt[] = [],
    fires: Fire[] = [],
    shots: EnemyShot[] = [];

/** Gel instance data handed to the renderer each frame (stuck blobs plus shots in flight). */
export const goo = { data: new Float32Array(GOO_CAPACITY * GOO_STRIDE), n: 0 };

// scratch objects shared by the combat modules (never held across calls)
export const H: Hit = { x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0 };
export const B = m4(),
    Lm = m4(),
    Tm = m4();

/** Encounter director state. */
export const D: Director = { lit: 0, queue: [], qt: 0, amb: 0, t: 0, boss: null, bossT: -1, won: false, wave: 0 };
