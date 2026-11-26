import { caps, gl } from './gl/context';
import { createProgram } from './gl/program';
import * as SH from './shaders';

/**
 * Material kinds a vertex can carry (Geo.mat's `kind`). On the enhanced path each one has its own
 * generated texture layer; the basic path shades 5-7 like the kind they are closest to.
 */
export const MATERIAL = {
    STEEL: 0,
    TERRAIN: 1,
    MACHINE: 2,
    ICE: 3,
    EMISSIVE: 4,
    WEAPON: 5,
    CONCRETE: 6,
    TIMBER: 7,
} as const;

const LAYERS = 7;
const SIZE = 512;
const LEVELS = Math.log2(SIZE) + 1;

export interface MaterialTextures {
    /** per layer: slope u, slope v, roughness offset, cavity */
    a: WebGLTexture;
    /** per layer: albedo tint (half scale), mask */
    b: WebGLTexture;
}

function createLayers(): WebGLTexture {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, LEVELS, gl.RGBA8, SIZE, SIZE, LAYERS);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    if (caps.aniso) gl.texParameterf(gl.TEXTURE_2D_ARRAY, caps.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    return t;
}

/**
 * Generates every material layer on the GPU: one pass draws the pattern (height, roughness, cavity,
 * tint), a second turns height into slope and packs the result. Takes a few milliseconds, once.
 * `tri` is the fullscreen-triangle vertex array.
 */
export function createMaterialTextures(tri: WebGLVertexArrayObject): MaterialTextures {
    const gen = createProgram(SH.FS_VS, SH.MATGEN_FS),
        pack = createProgram(SH.FS_VS, SH.MATPACK_FS);
    const targets = [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1];

    // one layer's worth of scratch space; float where possible so slopes are not quantised
    const scratch = targets.map(() => {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, caps.hdr ? gl.RGBA16F : gl.RGBA8, SIZE, SIZE, 0, gl.RGBA, caps.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        return t;
    });
    const scratchFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, scratchFbo);
    scratch.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, targets[i], gl.TEXTURE_2D, t, 0));
    gl.drawBuffers(targets);

    const a = createLayers(),
        b = createLayers();
    const layerFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, layerFbo);
    gl.drawBuffers(targets);

    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.viewport(0, 0, SIZE, SIZE);
    gl.bindVertexArray(tri);
    for (let layer = 0; layer < LAYERS; layer++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, scratchFbo);
        gl.useProgram(gen.p);
        gl.uniform1i(gen.u.uLayer, layer);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.bindFramebuffer(gl.FRAMEBUFFER, layerFbo);
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, targets[0], a, 0, layer);
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, targets[1], b, 0, layer);
        gl.useProgram(pack.p);
        scratch.forEach((t, i) => {
            gl.activeTexture(gl.TEXTURE3 + i);
            gl.bindTexture(gl.TEXTURE_2D, t);
        });
        gl.uniform1i(pack.u.uA, 3);
        gl.uniform1i(pack.u.uB, 4);
        gl.uniform2f(pack.u.uPx, 1 / SIZE, 1 / SIZE);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    for (const t of [a, b]) {
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
        gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    }

    // only the finished arrays are kept
    scratch.forEach((t, i) => {
        gl.activeTexture(gl.TEXTURE3 + i);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.deleteTexture(t);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(scratchFbo);
    gl.deleteFramebuffer(layerFbo);
    gl.deleteProgram(gen.p);
    gl.deleteProgram(pack.p);
    return { a, b };
}
