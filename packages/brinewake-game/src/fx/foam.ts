import { FOAM_CAPACITY, FOAM_STRIDE, type FoamStamps } from '@ryqndev/brinewake-renderer';

/** Foam stamps queued for the renderer, which draws them into the sea's foam map and empties the list. */
export const foam: FoamStamps = { data: new Float32Array(FOAM_CAPACITY * FOAM_STRIDE), n: 0 };

/** Leaves a patch of foam on the sea: wakes, splashes, the froth over a wreck. It fades over a few seconds. */
export function stampFoam(x: number, z: number, radius: number, strength: number) {
    if (foam.n >= FOAM_CAPACITY) return;
    const o = foam.n++ * FOAM_STRIDE;
    foam.data[o] = x;
    foam.data[o + 1] = z;
    foam.data[o + 2] = radius;
    foam.data[o + 3] = strength;
}
