import { allocBloom, bloom, caps, createFramebuffer, createNoiseTexture, createProgram, createTexture, drawParticles, fsPass, fxaa, gl, initParticles, initPost, type Program, uploadParticles } from '@ryqndev/kiln-gl';
import { m4, m4mul, m4ortho } from '@ryqndev/kiln-math';

import { cam } from './camera';
import { FAR, FOAM_CAPACITY, FOAM_STRIDE, INSTANCE_STRIDE, NEAR, PARTICLE_CAPACITY, post, R, SHADOW_RANGE, WORLD } from './config';
import { env } from './environment';
import type { Frame } from './frame';
import type { Mesh } from './geometry/mesh';
import { meshes } from './instances';
import { createOceanGrid, type OceanGrid } from './ocean';
import * as SH from './shaders';
import { waveA, waveB } from './waves';

const P: Record<string, Program> = {};
const FOAM_SIZE = 1024;
// texture units: 0 noise, 1 sun shadow, 2 terrain heights, 3 scene depth / post input, 4 bloom, 5 foam
const UNIT_NOISE = 0,
    UNIT_SHADOW = 1,
    UNIT_TERRAIN = 2,
    UNIT_A = 3,
    UNIT_B = 4,
    UNIT_FOAM = 5;

let tri!: WebGLVertexArrayObject;
let ocean!: OceanGrid;
let noiseTex!: WebGLTexture, terrainTex!: WebGLTexture, foamTex!: WebGLTexture, foamFbo!: WebGLFramebuffer;
let shadowTex: WebGLTexture | null = null,
    shadowFbo: WebGLFramebuffer | null = null,
    shadowSize = 0;
// size-dependent targets, (re)allocated by alloc()
let hdrTex!: WebGLTexture, depthTex!: WebGLTexture, hdrFbo!: WebGLFramebuffer, hdrFboND!: WebGLFramebuffer, ldrTex!: WebGLTexture, ldrFbo!: WebGLFramebuffer;
let instBuf!: WebGLBuffer,
    instCap = 0,
    instData = new Float32Array(INSTANCE_STRIDE * 256);
let foamVao!: WebGLVertexArrayObject, foamBuf!: WebGLBuffer;
const shadowM = m4(),
    lightVP = m4(),
    tmp = m4(),
    tmp2 = m4(),
    envU = new Float32Array(4);
let foamT = 0;
// static level geometry, drawn non-instanced every frame
const scene = {} as { props: Mesh; terrain: Mesh };
// the frame currently being rendered
let F!: Frame;

export function setScene(props: Mesh, terrain: Mesh) {
    scene.props = props;
    scene.terrain = terrain;
}

/**
 * Uploads the terrain's height in metres over the WORLD square, `size` x `size` samples in rows of
 * increasing z. The sea uses it to shoal, break into surf and turn clear at the beaches.
 */
export function setTerrainMap(heights: Float32Array, size: number) {
    terrainTex = createTexture(size, size, gl.R16F, gl.RED, gl.FLOAT, heights, gl.LINEAR);
}

export function initRenderer(canvas: HTMLCanvasElement) {
    R.canvas = canvas;
    P.lit = createProgram(SH.SURFACE_VS, SH.SURFACE_FS);
    P.litI = createProgram(SH.SURFACE_VS, SH.SURFACE_FS, '#define INST');
    P.water = createProgram(SH.WATER_VS, SH.WATER_FS);
    P.sky = createProgram(SH.SKY_VS, SH.SKY_FS);
    P.sh = createProgram(SH.SHADOW_VS, SH.SHADOW_FS);
    P.shI = createProgram(SH.SHADOW_VS, SH.SHADOW_FS, '#define INST');
    P.foam = createProgram(SH.FOAM_VS, SH.FOAM_FS);
    P.flat = createProgram(SH.FS_VS, SH.FLAT_FS);
    P.comp = createProgram(SH.FS_VS, SH.COMP_FS);
    // the shared passes: bloom and anti-aliasing (which also make the full-screen triangle), particles
    tri = initPost(5, UNIT_A);
    initParticles(PARTICLE_CAPACITY);

    // a vertex array holding one 2D shape in attribute 0
    const shape = (data: number[]) => {
        const v = gl.createVertexArray();
        gl.bindVertexArray(v);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        return v;
    };
    // per-instance vec4 attributes, starting at `first`, read from a dynamic buffer of `capacity` floats
    const instanced = (first: number, count: number, capacity: number) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, capacity * 4, gl.DYNAMIC_DRAW);
        for (let k = 0; k < count; k++) {
            gl.enableVertexAttribArray(first + k);
            gl.vertexAttribPointer(first + k, 4, gl.FLOAT, false, count * 16, k * 16);
            gl.vertexAttribDivisor(first + k, 1);
        }
        return b;
    };
    foamVao = shape([-1, -1, 1, -1, -1, 1, 1, 1]);
    foamBuf = instanced(1, FOAM_STRIDE / 4, FOAM_CAPACITY * FOAM_STRIDE);
    gl.bindVertexArray(null);

    ocean = createOceanGrid();
    noiseTex = createNoiseTexture();
    foamTex = createTexture(FOAM_SIZE, FOAM_SIZE, gl.R8, gl.RED, gl.UNSIGNED_BYTE, null);
    foamFbo = createFramebuffer(foamTex, null);
    clearFoam();
    instBuf = gl.createBuffer();
    resize();
}

/** Wipes every wake and patch of foam off the sea. */
export function clearFoam() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, foamFbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function alloc(w: number, h: number) {
    for (const t of [hdrTex, depthTex, ldrTex]) if (t) gl.deleteTexture(t);
    for (const f of [hdrFbo, hdrFboND, ldrFbo]) if (f) gl.deleteFramebuffer(f);
    const I = caps.hdr ? gl.RGBA16F : gl.RGBA8,
        Ty = caps.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    hdrTex = createTexture(w, h, I, gl.RGBA, Ty);
    depthTex = createTexture(w, h, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null, gl.NEAREST);
    hdrFbo = createFramebuffer(hdrTex, depthTex);
    hdrFboND = createFramebuffer(hdrTex, null);
    ldrTex = createTexture(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    ldrFbo = createFramebuffer(ldrTex, null);
    allocBloom(w, h);
    R.w = w;
    R.h = h;
}

function allocShadow(size: number) {
    if (shadowTex) gl.deleteTexture(shadowTex);
    if (shadowFbo) gl.deleteFramebuffer(shadowFbo);
    shadowTex = createTexture(size, size, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    shadowFbo = createFramebuffer(null, shadowTex);
    shadowSize = size;
}

/** Fits the render targets to the canvas, the quality level and the dynamic resolution factor. */
export function resize() {
    const c = R.canvas!,
        dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(2, Math.floor(c.clientWidth * dpr)),
        ch = Math.max(2, Math.floor(c.clientHeight * dpr));
    if (c.width !== cw || c.height !== ch) {
        c.width = cw;
        c.height = ch;
    }
    R.cw = cw;
    R.ch = ch;
    const budget = [0.9e6, 1.6e6, 2.6e6, 5e6][R.quality];
    const s = Math.min(1, Math.sqrt(budget / (cw * ch))) * R.dyn;
    const w = Math.max(160, Math.round((cw * s) / 2) * 2),
        h = Math.max(90, Math.round((ch * s) / 2) * 2);
    if (w !== R.w || h !== R.h) alloc(w, h);
    const sm = [1024, 2048, 2048, 4096][R.quality];
    if (sm !== shadowSize) allocShadow(sm);
}

// uniforms shared by every program built on the lighting chunk
function common(p: Program) {
    const u = p.u;
    gl.uniform3f(u.uCam, cam.x, cam.y, cam.z);
    gl.uniform3fv(u.uSunDir, env.sun);
    gl.uniform3fv(u.uSunCol, env.sunCol);
    gl.uniform3fv(u.uZenith, env.zenith);
    gl.uniform3fv(u.uHorizon, env.horizon);
    gl.uniform3fv(u.uDeep, env.deep);
    gl.uniform3fv(u.uShallow, env.shallow);
    gl.uniform4fv(u.uLP, F.lights.pos);
    gl.uniform3fv(u.uLC, F.lights.col);
    gl.uniform1i(u.uLN, F.lights.n);
    gl.uniform1f(u.uTime, F.time);
    gl.uniformMatrix4fv(u.uShadowM, false, shadowM);
    gl.uniform4fv(u.uEnv, envU);
    gl.uniform1i(u.uNoise, UNIT_NOISE);
    gl.uniform1i(u.uShadow, UNIT_SHADOW);
}
function drawInstances() {
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    for (const m of meshes) {
        if (!m.cnt) continue;
        gl.bindVertexArray(m.vao);
        const base = m.off * 4;
        for (let k = 0; k < 4; k++) gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, INSTANCE_STRIDE * 4, base + k * 16);
        gl.drawElementsInstanced(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0, m.cnt);
    }
}
function drawStatic() {
    gl.bindVertexArray(scene.props.vao);
    gl.drawElements(gl.TRIANGLES, scene.props.count, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(scene.terrain.vao);
    gl.drawElements(gl.TRIANGLES, scene.terrain.count, gl.UNSIGNED_INT, 0);
}
function bindTex(unit: number, t: WebGLTexture | null) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
}

// The sun's view of the area around the focus point, snapped to whole texels so that shadow edges
// do not crawl as the focus moves.
function updateShadowMatrix() {
    const fx = -env.sun[0],
        fy = -env.sun[1],
        fz = -env.sun[2];
    let sx = -fz,
        sz = fx;
    const sl = Math.hypot(sx, sz) || 1;
    sx /= sl;
    sz /= sl;
    const ux = -sz * fy,
        uy = sz * fx - sx * fz,
        uz = sx * fy;
    tmp.set([sx, ux, -fx, 0, 0, uy, -fy, 0, sz, uz, -fz, 0, 0, 0, 0, 1]);
    const X = F.focusX,
        Z = F.focusZ,
        tx = (2 * SHADOW_RANGE) / shadowSize;
    const lx = Math.round((sx * X + sz * Z) / tx) * tx,
        ly = Math.round((ux * X + uz * Z) / tx) * tx,
        lz = -(fx * X + fz * Z);
    m4ortho(tmp2, lx - SHADOW_RANGE, lx + SHADOW_RANGE, ly - SHADOW_RANGE, ly + SHADOW_RANGE, -(lz + 600), 600 - lz);
    m4mul(lightVP, tmp2, tmp);
    for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 3; r++) shadowM[c * 4 + r] = lightVP[c * 4 + r] * 0.5 + lightVP[c * 4 + 3] * 0.5;
        shadowM[c * 4 + 3] = lightVP[c * 4 + 3];
    }
}

export function render(frame: Frame) {
    F = frame;
    // ---- upload this frame's instances, particles and foam stamps ----
    let total = 0;
    for (const m of meshes) total += m.cnt;
    if (total * INSTANCE_STRIDE > instData.length) instData = new Float32Array(total * INSTANCE_STRIDE * 2);
    let o = 0;
    for (const m of meshes) {
        m.off = o;
        const n = m.cnt * INSTANCE_STRIDE;
        if (n) {
            instData.set(m.data.subarray(0, n), o);
            o += n;
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    if (instData.length > instCap) {
        gl.bufferData(gl.ARRAY_BUFFER, instData.byteLength, gl.DYNAMIC_DRAW);
        instCap = instData.length;
    }
    if (o) gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData, 0, o);
    const particles = Math.min(F.particleCount, PARTICLE_CAPACITY),
        stamps = Math.min(F.foam.n, FOAM_CAPACITY);
    uploadParticles(F.particles, particles);
    if (stamps) {
        gl.bindBuffer(gl.ARRAY_BUFFER, foamBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.foam.data, 0, stamps * FOAM_STRIDE);
    }
    F.foam.n = 0;
    envU[0] = env.fogDensity;
    envU[1] = 1 / shadowSize;
    envU[2] = env.lamp;
    envU[3] = env.stars;

    // ---- sun shadow map ----
    updateShadowMatrix();
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.viewport(0, 0, shadowSize, shadowSize);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.5, 3);
    gl.useProgram(P.sh.p);
    gl.uniformMatrix4fv(P.sh.u.uVP, false, lightVP);
    drawStatic();
    gl.useProgram(P.shI.p);
    gl.uniformMatrix4fv(P.shI.u.uVP, false, lightVP);
    drawInstances();
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // ---- foam map: stamp this frame's wakes and splashes, and let the old ones fade ----
    if (stamps || (foamT += F.dt) > 0.1) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, foamFbo);
        gl.viewport(0, 0, FOAM_SIZE, FOAM_SIZE);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        if (stamps) {
            gl.useProgram(P.foam.p);
            gl.uniform1f(P.foam.u.uScale, 1 / WORLD);
            gl.bindVertexArray(foamVao);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, stamps);
        }
        if (foamT > 0.1) {
            foamT = 0;
            gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
            gl.useProgram(P.flat.p);
            gl.uniform4f(P.flat.u.uCol, 2 / 255, 0, 0, 0);
            gl.bindVertexArray(tri);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.blendEquation(gl.FUNC_ADD);
        }
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
    }

    // ---- main HDR pass: land and ships, then the sky, then the sea over both ----
    const w = R.w,
        h = R.h;
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(env.horizon[0], env.horizon[1], env.horizon[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    bindTex(UNIT_NOISE, noiseTex);
    bindTex(UNIT_SHADOW, shadowTex);
    bindTex(UNIT_TERRAIN, terrainTex);
    bindTex(UNIT_FOAM, foamTex);
    gl.useProgram(P.lit.p);
    common(P.lit);
    gl.uniformMatrix4fv(P.lit.u.uVP, false, cam.vp);
    drawStatic();
    gl.useProgram(P.litI.p);
    common(P.litI);
    gl.uniformMatrix4fv(P.litI.u.uVP, false, cam.vp);
    drawInstances();
    for (const m of meshes) m.cnt = 0;

    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.useProgram(P.sky.p);
    common(P.sky);
    gl.uniformMatrix4fv(P.sky.u.uIVP, false, cam.sky);
    gl.bindVertexArray(tri);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);

    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
    gl.useProgram(P.water.p);
    common(P.water);
    gl.uniformMatrix4fv(P.water.u.uVP, false, cam.vp);
    gl.uniform4fv(P.water.u.uWave, waveA);
    gl.uniform4fv(P.water.u.uWaveB, waveB);
    gl.uniform1f(P.water.u.uWorld, 0.5 / WORLD);
    gl.uniform1i(P.water.u.uTerrain, UNIT_TERRAIN);
    gl.uniform1i(P.water.u.uFoam, UNIT_FOAM);
    gl.bindVertexArray(ocean.vao);
    gl.drawElements(gl.TRIANGLES, ocean.count, gl.UNSIGNED_INT, 0);
    gl.disable(gl.DEPTH_TEST);

    // ---- particles (softened against the scene's depth by hand) ----
    bindTex(UNIT_A, depthTex);
    if (particles) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFboND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        drawParticles(particles, cam, UNIT_A, UNIT_NOISE, NEAR, FAR);
    }
    gl.disable(gl.BLEND);

    // ---- bloom ----
    const glow = bloom(hdrTex, w, h);

    // ---- composite: tone map, grade, screen effects ----
    fsPass(P.comp, ldrFbo, w, h);
    bindTex(UNIT_A, hdrTex);
    bindTex(UNIT_B, glow);
    gl.uniform1i(P.comp.u.uT, UNIT_A);
    gl.uniform1i(P.comp.u.uBloom, UNIT_B);
    gl.uniform4f(P.comp.u.uP, post.exposure * env.exposure, post.bloom, post.vig, (F.time * 61.7) % 97);
    gl.uniform4f(P.comp.u.uFx, post.dmg, post.flash, post.desat, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ---- FXAA to screen ----
    fxaa(ldrTex, w, h, R.cw, R.ch);
    bindTex(UNIT_A, null);
    bindTex(UNIT_B, null);
}
