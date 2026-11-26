import { TAU } from '@ryqndev/rimefire-math';

import { gl } from './gl/context';

export interface OceanGrid {
    vao: WebGLVertexArrayObject;
    /** index count */
    count: number;
}

const RINGS = 128,
    SPOKES = 192;
// ring k sits at A * (e^(B k) - 1) metres: 1.28 m apart under the camera, reaching past the far plane.
// water.vert.glsl derives the local ring spacing from the same two numbers (1.28 + 0.04 r).
const A = 32,
    B = 0.04;

/**
 * The sea's mesh: a disc of concentric rings centred under the camera, fine where the swell is
 * seen up close and coarse toward the horizon. The vertex shader places it and adds the waves.
 */
export function createOceanGrid(): OceanGrid {
    const pos = new Float32Array((RINGS * SPOKES + 1) * 2),
        idx = new Uint32Array(SPOKES * 3 + (RINGS - 1) * SPOKES * 6);
    // vertex 0 is the centre; ring k (1-based) starts at 1 + (k - 1) * SPOKES
    for (let k = 1; k <= RINGS; k++) {
        const r = A * (Math.exp(B * k) - 1);
        for (let j = 0; j < SPOKES; j++) {
            const a = (j / SPOKES) * TAU,
                o = (1 + (k - 1) * SPOKES + j) * 2;
            pos[o] = Math.cos(a) * r;
            pos[o + 1] = Math.sin(a) * r;
        }
    }
    let n = 0;
    for (let j = 0; j < SPOKES; j++) {
        idx[n++] = 0;
        idx[n++] = 1 + j;
        idx[n++] = 1 + ((j + 1) % SPOKES);
    }
    for (let k = 1; k < RINGS; k++) {
        const inner = 1 + (k - 1) * SPOKES,
            outer = inner + SPOKES;
        for (let j = 0; j < SPOKES; j++) {
            const j1 = (j + 1) % SPOKES;
            idx[n++] = inner + j;
            idx[n++] = outer + j;
            idx[n++] = outer + j1;
            idx[n++] = inner + j;
            idx[n++] = outer + j1;
            idx[n++] = inner + j1;
        }
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: idx.length };
}
