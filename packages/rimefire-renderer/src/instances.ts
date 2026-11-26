import type { Mat4 } from '@ryqndev/kiln-math';

import { INSTANCE_STRIDE } from './config';
import type { Geo } from './geometry/Geo';
import type { Mesh } from './geometry/mesh';

/** Every mesh that can be drawn instanced; the renderer walks this list each frame. */
export const meshes: Mesh[] = [];

/** Uploads a geometry and makes it drawable through addInstance(). */
export function registerMesh(g: Geo): Mesh {
    const m = g.build(true);
    m.data = [new Float32Array(INSTANCE_STRIDE * 8), new Float32Array(INSTANCE_STRIDE * 4)];
    meshes.push(m);
    return m;
}
/** Queues one instance of a mesh for this frame. Layer 1 is the first-person viewmodel. */
export function addInstance(m: Mesh, mat: Mat4, r = 1, g = 1, b = 1, flash = 0, emis = 1, diss = 0, layer = 0) {
    let d = m.data[layer];
    const n = m.cnt[layer];
    if ((n + 1) * INSTANCE_STRIDE > d.length) {
        const nd = new Float32Array(d.length * 2);
        nd.set(d);
        d = m.data[layer] = nd;
    }
    const o = n * INSTANCE_STRIDE;
    d[o] = mat[0];
    d[o + 1] = mat[4];
    d[o + 2] = mat[8];
    d[o + 3] = mat[12];
    d[o + 4] = mat[1];
    d[o + 5] = mat[5];
    d[o + 6] = mat[9];
    d[o + 7] = mat[13];
    d[o + 8] = mat[2];
    d[o + 9] = mat[6];
    d[o + 10] = mat[10];
    d[o + 11] = mat[14];
    d[o + 12] = r;
    d[o + 13] = g;
    d[o + 14] = b;
    d[o + 15] = flash;
    d[o + 16] = emis;
    d[o + 17] = diss;
    d[o + 18] = 0;
    d[o + 19] = 0;
    m.cnt[layer] = n + 1;
}
