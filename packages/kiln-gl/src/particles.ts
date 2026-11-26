import type { Mat4 } from '@ryqndev/kiln-math';

import { gl } from './context';
import { createProgram, type Program } from './program';
import { PART_FS, PART_VS } from './shaders';

/** Floats per particle: four vec4s (position + size, colour, parameters, velocity), as particle.vert reads them. */
export const PARTICLE_STRIDE = 16;

/** What the particle pass needs of a camera: its view-projection, position, and right and up vectors. */
export interface BillboardCamera {
    vp: Mat4;
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    ux: number;
    uy: number;
    uz: number;
}

let program!: Program, vao!: WebGLVertexArrayObject, buffer!: WebGLBuffer;

/** Sets up the particle pass for at most `capacity` particles a frame. Call once, after initGL(). */
export function initParticles(capacity: number) {
    program = createProgram(PART_VS, PART_FS);
    // one quad in attribute 0, instanced over the particles in attributes 1 to 4
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, capacity * PARTICLE_STRIDE * 4, gl.DYNAMIC_DRAW);
    for (let k = 0; k < PARTICLE_STRIDE / 4; k++) {
        gl.enableVertexAttribArray(1 + k);
        gl.vertexAttribPointer(1 + k, 4, gl.FLOAT, false, PARTICLE_STRIDE * 4, k * 16);
        gl.vertexAttribDivisor(1 + k, 1);
    }
}

/** Uploads this frame's particles: the first `count` of them in `data`. */
export function uploadParticles(data: Float32Array, count: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if (count) gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * PARTICLE_STRIDE);
}

/**
 * Draws the uploaded particles into the bound target, with the blend state as the caller left it.
 * They are softened by hand against the scene's depth, so the target must have no depth
 * attachment; `depthUnit` and `noiseUnit` are the texture units holding the scene's depth and the
 * noise texture.
 */
export function drawParticles(count: number, cam: BillboardCamera, depthUnit: number, noiseUnit: number, near: number, far: number) {
    const u = program.u;
    gl.useProgram(program.p);
    gl.uniformMatrix4fv(u.uVP, false, cam.vp);
    gl.uniform3f(u.uCR, cam.rx, cam.ry, cam.rz);
    gl.uniform3f(u.uCU, cam.ux, cam.uy, cam.uz);
    gl.uniform3f(u.uCam, cam.x, cam.y, cam.z);
    gl.uniform1i(u.uDepth, depthUnit);
    gl.uniform1i(u.uNoise, noiseUnit);
    gl.uniform2f(u.uNF, near, far);
    gl.bindVertexArray(vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
}
