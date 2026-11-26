import { caps, gl } from './context';
import { createProgram, type Program } from './program';
import { DOWN_FS, FS_VS, FXAA_FS, UP_FS } from './shaders';
import { createFramebuffer, createTexture } from './texture';

interface BloomLevel {
    t: WebGLTexture;
    f: WebGLFramebuffer;
    w: number;
    h: number;
}

let tri!: WebGLVertexArrayObject;
let downK!: Program, down!: Program, up!: Program, aa!: Program;
let chain: BloomLevel[] = [];
let depth = 5,
    unit = 0;

/**
 * Sets up the full-screen passes: the triangle they all draw, and the bloom and anti-aliasing
 * programs. Call once, after initGL(), alongside the renderer's own createProgram() calls so that
 * everything compiles side by side.
 *
 * `bloomLevels` is how many times the bloom halves the scene at most; `textureUnit` the unit these
 * passes are free to bind their input to. Returns the triangle's vertex array, for passes that
 * bind it themselves.
 */
export function initPost(bloomLevels: number, textureUnit: number): WebGLVertexArrayObject {
    depth = bloomLevels;
    unit = textureUnit;
    downK = createProgram(FS_VS, DOWN_FS, '#define KARIS');
    down = createProgram(FS_VS, DOWN_FS);
    up = createProgram(FS_VS, UP_FS);
    aa = createProgram(FS_VS, FXAA_FS);
    // one triangle that covers the screen, in attribute 0
    tri = gl.createVertexArray();
    gl.bindVertexArray(tri);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return tri;
}

/**
 * Starts a full-screen pass into `fbo` (null for the canvas): binds the target, sizes the viewport
 * and leaves `p` in use with the triangle bound. Set the uniforms, then draw three vertices.
 */
export function fsPass(p: Program, fbo: WebGLFramebuffer | null, w: number, h: number) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(p.p);
    gl.bindVertexArray(tri);
}

/** (Re)allocates the bloom chain for a scene of w x h pixels. Call whenever the scene target is resized. */
export function allocBloom(w: number, h: number) {
    for (const b of chain) {
        gl.deleteTexture(b.t);
        gl.deleteFramebuffer(b.f);
    }
    const I = caps.hdr ? gl.RGBA16F : gl.RGBA8,
        Ty = caps.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    chain = [];
    let bw = w >> 1,
        bh = h >> 1;
    for (let i = 0; i < depth && bw > 8 && bh > 8; i++) {
        const t = createTexture(bw, bh, I, gl.RGBA, Ty);
        chain.push({ t, f: createFramebuffer(t, null), w: bw, h: bh });
        bw >>= 1;
        bh >>= 1;
    }
}

/**
 * Blurs the bright parts of `scene` (w x h pixels) down the chain and back up it. Returns the
 * texture to add over the scene when compositing. Expects blending off, and leaves it off.
 */
export function bloom(scene: WebGLTexture, w: number, h: number): WebGLTexture {
    let src = scene,
        sw = w,
        sh = h;
    for (let i = 0; i < chain.length; i++) {
        const b = chain[i],
            p = i ? down : downK;
        fsPass(p, b.f, b.w, b.h);
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, src);
        gl.uniform1i(p.u.uT, unit);
        gl.uniform2f(p.u.uPx, 1 / sw, 1 / sh);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        src = b.t;
        sw = b.w;
        sh = b.h;
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = chain.length - 1; i > 0; i--) {
        const b = chain[i],
            d = chain[i - 1];
        fsPass(up, d.f, d.w, d.h);
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, b.t);
        gl.uniform1i(up.u.uT, unit);
        gl.uniform2f(up.u.uPx, 0.5 / b.w, 0.5 / b.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);
    return chain[0].t;
}

/** Anti-aliases the finished frame `src` (w x h pixels) onto the canvas (cw x ch pixels). */
export function fxaa(src: WebGLTexture, w: number, h: number, cw: number, ch: number) {
    fsPass(aa, null, cw, ch);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.uniform1i(aa.u.uT, unit);
    gl.uniform2f(aa.u.uPx, 1 / w, 1 / h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}
