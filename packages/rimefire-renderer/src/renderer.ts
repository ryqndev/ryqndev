import { allocBloom, bloom, caps, createFramebuffer, createNoiseTexture, createProgram, createTexture, drawParticles, fsPass, fxaa, gl, initParticles, initPost, type Program, uploadParticles } from '@ryqndev/kiln-gl';
import { m4, m4mul, m4ortho } from '@ryqndev/kiln-math';

import { cam, project, type ScreenPoint } from './camera';
import { FAR, FOG, GOO_CAPACITY, GOO_STRIDE, INSTANCE_STRIDE, NEAR, PARTICLE_CAPACITY, post, R, SHR, SM, SUN, SUNCOL } from './config';
import { initEnvironment, updateEnvironment } from './environment';
import type { Frame } from './frame';
import { icoSphere } from './geometry/icosphere';
import type { Mesh } from './geometry/mesh';
import { meshes } from './instances';
import { shadowTextures, shadowUniforms, updateLightShadows } from './light-shadows';
import { createMaterialTextures, type MaterialTextures } from './materials';
import * as SH from './shaders';

const P: Record<string, Program> = {};

/** The programs that shade lit geometry: static meshes, instanced meshes and gel. */
interface LitPrograms {
    s: Program;
    i: Program;
    goo: Program;
}
// Two builds of the lit shaders. The enhanced one (HIGH and ULTRA) adds generated materials and
// sky-sampled lighting; the basic one is untouched. Each is compiled the first time it is needed.
let litBasic: LitPrograms | null = null,
    litEnhanced: LitPrograms | null = null;
let materials: MaterialTextures | null = null,
    envCube: WebGLTexture | null = null;
// light scattering (enhanced path): a half-resolution target, the march program per quality level
// and the upsample; all created the first time they are drawn
let volTex: WebGLTexture | null = null,
    volFbo: WebGLFramebuffer | null = null,
    volApply: Program | null = null;
const volMarch: (Program | undefined)[] = [];
// texture units reserved for the enhanced path
const UNIT_MAT_A = 5,
    UNIT_MAT_B = 6,
    UNIT_ENV = 7,
    UNIT_SHADOW_STATIC = 8,
    UNIT_SHADOW_DYNAMIC = 9;

/** HIGH and ULTRA use the enhanced shading path. */
const enhanced = () => R.quality >= 2;

function litPrograms(hi: boolean): LitPrograms {
    if (hi) {
        return (litEnhanced ??= {
            s: createProgram(SH.UBER_VS, SH.UBER_FS, '#define HI'),
            i: createProgram(SH.UBER_VS, SH.UBER_FS, '#define INST\n#define HI'),
            goo: createProgram(SH.GOO_VS, SH.GOO_FS, '#define HI'),
        });
    }
    return (litBasic ??= {
        s: createProgram(SH.UBER_VS, SH.UBER_FS),
        i: createProgram(SH.UBER_VS, SH.UBER_FS, '#define INST'),
        goo: createProgram(SH.GOO_VS, SH.GOO_FS),
    });
}
let tri!: WebGLVertexArrayObject, quad!: WebGLVertexArrayObject;
let noiseTex!: WebGLTexture, shadowTex!: WebGLTexture, shadowFbo!: WebGLFramebuffer, scorchTex!: WebGLTexture, scorchFbo!: WebGLFramebuffer;
// size-dependent targets, (re)allocated by alloc()
let hdrTex!: WebGLTexture, depthTex!: WebGLTexture, hdrFbo!: WebGLFramebuffer, hdrFboND!: WebGLFramebuffer, ldrTex!: WebGLTexture, ldrFbo!: WebGLFramebuffer;
let aoT: WebGLTexture[] = [],
    aoF: WebGLFramebuffer[] = [];
let instBuf!: WebGLBuffer,
    instCap = 0,
    instData = new Float32Array(INSTANCE_STRIDE * 256);
let gooVao!: WebGLVertexArrayObject, gooBuf!: WebGLBuffer, gooIdx = 0, snowVao!: WebGLVertexArrayObject;
const SNOWN = 1500;
const shadowM = m4(),
    lightVP = m4(),
    tmp = m4(),
    tmp2 = m4();
let scorchT = 0;
// static level geometry, drawn non-instanced every frame
const scene = {} as { props: Mesh; terrain: Mesh };
// the frame currently being rendered
let F!: Frame;

export function setScene(props: Mesh, terrain: Mesh) {
    scene.props = props;
    scene.terrain = terrain;
}

export function initRenderer(canvas: HTMLCanvasElement) {
    R.canvas = canvas;
    P.shS = createProgram(SH.SHADOW_VS, SH.SHADOW_FS);
    P.shI = createProgram(SH.SHADOW_VS, SH.SHADOW_FS, '#define INST');
    P.snow = createProgram(SH.SNOW_VS, SH.SNOW_FS);
    P.sky = createProgram(SH.SKY_VS, SH.SKY_FS);
    P.comp = createProgram(SH.FS_VS, SH.COMP_FS);
    P.ao = createProgram(SH.FS_VS, SH.AO_FS);
    P.aoBlur = createProgram(SH.FS_VS, SH.AOBLUR_FS);
    P.aoApply = createProgram(SH.FS_VS, SH.AOAPPLY_FS);
    P.stamp = createProgram(SH.STAMP_VS, SH.STAMP_FS);
    P.flat = createProgram(SH.FS_VS, SH.FLAT_FS);
    // the shared passes: bloom and anti-aliasing (which also make the full-screen triangle), particles
    tri = initPost(6, 3);
    initParticles(PARTICLE_CAPACITY);

    const mkQ = (data: number[]): [WebGLVertexArrayObject, WebGLBuffer] => {
        const v = gl.createVertexArray();
        gl.bindVertexArray(v);
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        return [v, b];
    };
    quad = mkQ([-1, -1, 1, -1, -1, 1, 1, 1])[0];

    noiseTex = createNoiseTexture();
    shadowTex = createTexture(SM, SM, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    shadowFbo = createFramebuffer(null, shadowTex);
    scorchTex = createTexture(512, 512, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null);
    scorchFbo = createFramebuffer(scorchTex, null);
    clearScorch();

    instBuf = gl.createBuffer();

    // goo
    const ico = icoSphere(3);
    gooVao = gl.createVertexArray();
    gl.bindVertexArray(gooVao);
    const gb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gb);
    gl.bufferData(gl.ARRAY_BUFFER, ico.pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const gi = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gi);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ico.idx, gl.STATIC_DRAW);
    gooIdx = ico.idx.length;
    gooBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gooBuf);
    gl.bufferData(gl.ARRAY_BUFFER, GOO_CAPACITY * GOO_STRIDE * 4, gl.DYNAMIC_DRAW);
    for (let k = 0; k < 3; k++) {
        gl.enableVertexAttribArray(4 + k);
        gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, 48, k * 16);
        gl.vertexAttribDivisor(4 + k, 1);
    }

    // snow
    const sq = mkQ([-1, -1, 1, -1, -1, 1, 1, 1]);
    snowVao = sq[0];
    const sd = new Float32Array(SNOWN * 4);
    for (let i = 0; i < sd.length; i++) sd[i] = Math.random();
    const sb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sb);
    gl.bufferData(gl.ARRAY_BUFFER, sd, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
    resize();
}

export function clearScorch() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, scorchFbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function alloc(w: number, h: number) {
    for (const t of [hdrTex, depthTex, ldrTex, volTex, ...aoT]) if (t) gl.deleteTexture(t);
    for (const f of [hdrFbo, hdrFboND, ldrFbo, volFbo, ...aoF]) if (f) gl.deleteFramebuffer(f);
    volTex = volFbo = null;
    const I = caps.hdr ? gl.RGBA16F : gl.RGBA8,
        Ty = caps.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    hdrTex = createTexture(w, h, I, gl.RGBA, Ty);
    depthTex = createTexture(w, h, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null, gl.NEAREST);
    hdrFbo = createFramebuffer(hdrTex, depthTex);
    hdrFboND = createFramebuffer(hdrTex, null);
    ldrTex = createTexture(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    ldrFbo = createFramebuffer(ldrTex, null);
    allocBloom(w, h);
    aoT = [];
    aoF = [];
    for (let i = 0; i < 2; i++) {
        aoT[i] = createTexture(w >> 1, h >> 1, gl.R8, gl.RED, gl.UNSIGNED_BYTE);
        aoF[i] = createFramebuffer(aoT[i], null);
    }
    R.w = w;
    R.h = h;
}

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
}

// uniforms shared by every lit program
function common(p: Program, hi: boolean) {
    const u = p.u;
    gl.uniform3f(u.uCam, cam.x, cam.y, cam.z);
    gl.uniform3fv(u.uSunDir, SUN);
    gl.uniform3fv(u.uSunCol, SUNCOL);
    gl.uniform4fv(u.uLP, F.lights.pos);
    gl.uniform3fv(u.uLC, F.lights.col);
    gl.uniform1i(u.uLN, F.lights.n);
    gl.uniform1f(u.uTime, F.time);
    gl.uniformMatrix4fv(u.uShadowM, false, shadowM);
    gl.uniform4fv(u.uFog, FOG);
    gl.uniform1i(u.uNoise, 0);
    gl.uniform1i(u.uShadow, 1);
    gl.uniform1i(u.uScorch, 2);
    if (hi) {
        gl.uniform1i(u.uMatA, UNIT_MAT_A);
        gl.uniform1i(u.uMatB, UNIT_MAT_B);
        gl.uniform1i(u.uEnv, UNIT_ENV);
        gl.uniform1i(u.uSA, UNIT_SHADOW_STATIC);
        gl.uniform1i(u.uDA, UNIT_SHADOW_DYNAMIC);
        gl.uniform1fv(u.uLS, shadowUniforms.codes);
        gl.uniform3fv(u.uDL, shadowUniforms.origins);
        gl.uniform4fv(u.uSP, shadowUniforms.static);
        gl.uniform4fv(u.uDP, shadowUniforms.dynamic);
        gl.uniform2fv(u.uSG, shadowUniforms.grid);
    }
}
function drawInst(layer: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    for (const m of meshes) {
        const n = m.cnt[layer];
        if (!n) continue;
        gl.bindVertexArray(m.vao);
        const base = m.off[layer] * 4;
        for (let k = 0; k < 5; k++) gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, 80, base + k * 16);
        gl.drawElementsInstanced(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0, n);
    }
}
function bindTex(unit: number, t: WebGLTexture | null) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
}
// depth-only draw of the shadow casters: the props, optionally the terrain, and unless
// `staticOnly` every instanced mesh queued this frame
function drawCasters(viewProj: Float32Array, staticOnly: boolean, terrain: boolean) {
    gl.useProgram(P.shS.p);
    gl.uniformMatrix4fv(P.shS.u.uVP, false, viewProj);
    gl.bindVertexArray(scene.props.vao);
    gl.drawElements(gl.TRIANGLES, scene.props.count, gl.UNSIGNED_INT, 0);
    if (terrain) {
        gl.bindVertexArray(scene.terrain.vao);
        gl.drawElements(gl.TRIANGLES, scene.terrain.count, gl.UNSIGNED_INT, 0);
    }
    if (staticOnly) return;
    gl.useProgram(P.shI.p);
    gl.uniformMatrix4fv(P.shI.u.uVP, false, viewProj);
    drawInst(0);
}
// sky into whatever target is bound; `capture` is set when filling the environment map
function drawSky(unproject: Float32Array, capture: boolean) {
    gl.useProgram(P.sky.p);
    gl.uniformMatrix4fv(P.sky.u.uIVP, false, unproject);
    gl.uniform3fv(P.sky.u.uSunDir, SUN);
    gl.uniform1f(P.sky.u.uTime, F.time);
    gl.uniform4fv(P.sky.u.uFog, FOG);
    gl.uniform1i(P.sky.u.uNoise, 0);
    gl.uniform1f(P.sky.u.uCapture, capture ? 1 : 0);
    gl.bindVertexArray(tri);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}
// The light-scattering march for the current quality level (ULTRA takes more samples). Also makes
// sure the upsample program exists.
function volumetricMarch(): Program {
    const ultra = R.quality >= 3;
    volApply ??= createProgram(SH.FS_VS, SH.VOLAPPLY_FS);
    return (volMarch[+ultra] ??= createProgram(SH.FS_VS, SH.VOL_FS, `#define HI\n#define STEPS ${ultra ? 10 : 6}\n#define MOON_STEPS ${ultra ? 18 : 10}`));
}
// Light scattered by the air between the camera and the scene: marched at half resolution from
// the depth buffer, then upsampled and added over the opaque scene.
function drawVolumetrics(march: Program, w: number, h: number) {
    const hw = w >> 1,
        hh = h >> 1,
        apply = volApply!;
    if (!volTex) {
        volTex = createTexture(hw, hh, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.NEAREST);
        volFbo = createFramebuffer(volTex, null);
    }
    const proj = cam.proj;
    bindTex(3, depthTex);
    gl.disable(gl.BLEND);
    fsPass(march, volFbo, hw, hh);
    common(march, true);
    gl.uniform1i(march.u.uDepth, 3);
    gl.uniform4f(march.u.uProj, proj[14], proj[10], 1 / proj[0], 1 / proj[5]);
    gl.uniform3f(march.u.uCR, cam.rx, cam.ry, cam.rz);
    gl.uniform3f(march.u.uCU, cam.ux, cam.uy, cam.uz);
    gl.uniform3f(march.u.uCF, cam.fx, cam.fy, cam.fz);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    fsPass(apply, hdrFboND, w, h);
    bindTex(4, volTex);
    gl.uniform1i(apply.u.uT, 4);
    gl.uniform1i(apply.u.uDepth, 3);
    gl.uniform4f(apply.u.uProj, proj[14], proj[10], 1 / proj[0], 1 / proj[5]);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}


const pj: ScreenPoint = { x: 0, y: 0, w: 0 },
    swU = new Float32Array(16);

export function render(frame: Frame) {
    F = frame;
    const dt = frame.dt;
    // ---- upload instance data ----
    let total = 0;
    for (const m of meshes) total += m.cnt[0] + m.cnt[1];
    if (total * INSTANCE_STRIDE > instData.length) instData = new Float32Array(total * INSTANCE_STRIDE * 2);
    let o = 0;
    for (const m of meshes)
        for (let l = 0; l < 2; l++) {
            m.off[l] = o;
            const n = m.cnt[l] * INSTANCE_STRIDE;
            if (n) {
                instData.set(m.data[l].subarray(0, n), o);
                o += n;
            }
        }
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    if (instData.length > instCap) {
        gl.bufferData(gl.ARRAY_BUFFER, instData.byteLength, gl.DYNAMIC_DRAW);
        instCap = instData.length;
    }
    if (o) gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData, 0, o);
    gl.bindBuffer(gl.ARRAY_BUFFER, gooBuf);
    if (F.gooCount) gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.goo, 0, F.gooCount * GOO_STRIDE);
    uploadParticles(F.particles, F.particleCount);

    // ---- shadow matrix (stabilised, follows the camera) ----
    {
        const fx = -SUN[0],
            fy = -SUN[1],
            fz = -SUN[2];
        let sx = -fz,
            sz = fx;
        const sl = Math.hypot(sx, sz);
        sx /= sl;
        sz /= sl;
        const ux = -sz * fy,
            uy = sz * fx - sx * fz,
            uz = sx * fy;
        tmp.set([sx, ux, -fx, 0, 0, uy, -fy, 0, sz, uz, -fz, 0, 0, 0, 0, 1]);
        const hl = Math.hypot(cam.fx, cam.fz) || 1;
        const Fx = cam.x + (cam.fx / hl) * 24,
            Fy = cam.y,
            Fz = cam.z + (cam.fz / hl) * 24;
        const tx = (2 * SHR) / SM;
        const lx = Math.round((sx * Fx + sz * Fz) / tx) * tx,
            ly = Math.round((ux * Fx + uy * Fy + uz * Fz) / tx) * tx,
            lz = -(fx * Fx + fy * Fy + fz * Fz);
        m4ortho(tmp2, lx - SHR, lx + SHR, ly - SHR, ly + SHR, -(lz + 140), 140 - lz);
        m4mul(lightVP, tmp2, tmp);
        for (let c = 0; c < 4; c++) {
            for (let r = 0; r < 3; r++) shadowM[c * 4 + r] = lightVP[c * 4 + r] * 0.5 + lightVP[c * 4 + 3] * 0.5;
            shadowM[c * 4 + 3] = lightVP[c * 4 + 3];
        }
    }
    // ---- enhanced path: generated materials and the sky environment map ----
    // programs are requested up front: they compile while the rest of the frame is being set up
    const hi = enhanced(),
        lit = litPrograms(hi),
        // light scattering stores depth in its target, which needs float render targets
        march = hi && caps.hdr ? volumetricMarch() : null;
    if (hi) {
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        materials ??= createMaterialTextures(tri);
        envCube ??= initEnvironment();
        bindTex(0, noiseTex);
        updateEnvironment((unproject) => drawSky(unproject, true));
        gl.activeTexture(gl.TEXTURE0 + UNIT_MAT_A);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, materials.a);
        gl.activeTexture(gl.TEXTURE0 + UNIT_MAT_B);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, materials.b);
        gl.activeTexture(gl.TEXTURE0 + UNIT_ENV);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, envCube);
    }

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.viewport(0, 0, SM, SM);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.5, 3);
    // the moon: props and everything instanced; the enhanced path adds the terrain itself
    drawCasters(lightVP, false, hi);
    if (hi) {
        // local lights: fixed ones are baked once, the brightest fires and blasts are redrawn each frame
        updateLightShadows(F.lights.shadow, F.lights.pos, F.lights.n, R.quality >= 3 ? 2 : 1, (vp, staticOnly) => drawCasters(vp, staticOnly, staticOnly));
        const st = shadowTextures();
        bindTex(UNIT_SHADOW_STATIC, st.static);
        bindTex(UNIT_SHADOW_DYNAMIC, st.dynamic);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // ---- scorch map ----
    if (F.stamps.length || (scorchT += dt) > 0.1) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, scorchFbo);
        gl.viewport(0, 0, 512, 512);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        if (F.stamps.length) {
            gl.useProgram(P.stamp.p);
            bindTex(0, noiseTex);
            gl.uniform1i(P.stamp.u.uNoise, 0);
            gl.bindVertexArray(quad);
            for (let i = 0; i < F.stamps.length; i += 5) {
                gl.uniform4f(P.stamp.u.uR, F.stamps[i] / 64, F.stamps[i + 1] / 64, F.stamps[i + 2] / 64, 0);
                gl.uniform4f(P.stamp.u.uCol, F.stamps[i + 3], F.stamps[i + 4], 0, 0);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            F.stamps.length = 0;
        }
        if (scorchT > 0.1) {
            scorchT = 0;
            gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
            gl.colorMask(false, true, false, false);
            gl.useProgram(P.flat.p);
            gl.uniform4f(P.flat.u.uCol, 0, 3 / 255, 0, 0);
            gl.bindVertexArray(tri);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.blendEquation(gl.FUNC_ADD);
            gl.colorMask(true, true, true, true);
        }
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
    }

    // ---- main HDR pass ----
    const w = R.w,
        h = R.h;
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(FOG[0], FOG[1], FOG[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    bindTex(0, noiseTex);
    bindTex(1, shadowTex);
    bindTex(2, scorchTex);
    gl.useProgram(lit.s.p);
    common(lit.s, hi);
    gl.uniformMatrix4fv(lit.s.u.uVP, false, cam.vp);
    gl.bindVertexArray(scene.props.vao);
    gl.drawElements(gl.TRIANGLES, scene.props.count, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(scene.terrain.vao);
    gl.drawElements(gl.TRIANGLES, scene.terrain.count, gl.UNSIGNED_INT, 0);
    gl.useProgram(lit.i.p);
    common(lit.i, hi);
    gl.uniformMatrix4fv(lit.i.u.uVP, false, cam.vp);
    drawInst(0);
    if (F.gooCount) {
        gl.useProgram(lit.goo.p);
        common(lit.goo, hi);
        gl.uniformMatrix4fv(lit.goo.u.uVP, false, cam.vp);
        gl.bindVertexArray(gooVao);
        gl.drawElementsInstanced(gl.TRIANGLES, gooIdx, gl.UNSIGNED_SHORT, 0, F.gooCount);
    }
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    drawSky(cam.sky, false);
    gl.depthFunc(gl.LESS);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    // ---- SSAO ----
    bindTex(3, depthTex);
    if (R.ao) {
        const hw = w >> 1,
            hh = h >> 1;
        fsPass(P.ao, aoF[0], hw, hh);
        gl.uniform1i(P.ao.u.uDepth, 3);
        gl.uniform4f(P.ao.u.uProj, cam.proj[14], cam.proj[10], 1 / cam.proj[0], 1 / cam.proj[5]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        fsPass(P.aoBlur, aoF[1], hw, hh);
        bindTex(4, aoT[0]);
        gl.uniform1i(P.aoBlur.u.uT, 4);
        gl.uniform2f(P.aoBlur.u.uPx, 1 / hw, 1 / hh);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        fsPass(P.aoApply, hdrFboND, w, h);
        bindTex(4, aoT[1]);
        gl.uniform1i(P.aoApply.u.uT, 4);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // ---- light scattering in the air ----
    if (march) drawVolumetrics(march, w, h);

    // ---- particles + snow (manual depth test against the scene) ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFboND);
    gl.viewport(0, 0, w, h);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P.snow.p);
    gl.uniformMatrix4fv(P.snow.u.uVP, false, cam.vp);
    gl.uniform3f(P.snow.u.uCam, cam.x, cam.y, cam.z);
    gl.uniform1f(P.snow.u.uTime, F.time);
    gl.uniform1i(P.snow.u.uDepth, 3);
    gl.uniform2f(P.snow.u.uNF, NEAR, FAR);
    gl.uniform3f(P.snow.u.uCol, 0.5, 0.62, 0.8);
    gl.bindVertexArray(snowVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, SNOWN);
    if (F.particleCount) drawParticles(F.particleCount, cam, 3, 0, NEAR, FAR);
    gl.disable(gl.BLEND);

    // ---- first-person viewmodel (own projection, compressed depth range) ----
    bindTex(3, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFbo);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.depthRange(0, 0.06);
    gl.useProgram(lit.i.p);
    gl.uniformMatrix4fv(lit.i.u.uVP, false, cam.vmVP);
    drawInst(1);
    gl.depthRange(0, 1);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    for (const m of meshes) m.cnt[0] = m.cnt[1] = 0;

    // ---- bloom ----
    const glow = bloom(hdrTex, w, h);

    // ---- composite ----
    fsPass(P.comp, ldrFbo, w, h);
    bindTex(3, hdrTex);
    bindTex(4, glow);
    gl.uniform1i(P.comp.u.uT, 3);
    gl.uniform1i(P.comp.u.uBloom, 4);
    gl.uniform4f(P.comp.u.uP, post.exposure, post.bloom, post.vig, (F.time * 61.7) % 97);
    gl.uniform4f(P.comp.u.uFx, post.dmg, post.ca, post.desat, post.flash);
    gl.uniform1f(P.comp.u.uAspect, w / h);
    swU.fill(0);
    for (let i = F.shockwaves.length - 1; i >= 0; i--) {
        const s = F.shockwaves[i];
        if (project(s.x, s.y, s.z, pj)) {
            swU[i * 4] = pj.x;
            swU[i * 4 + 1] = 1 - pj.y;
            swU[i * 4 + 2] = (s.t * 16 * cam.proj[5]) / (2 * pj.w);
            swU[i * 4 + 3] = s.str * (1 - s.t / 0.55) * Math.min(1, 14 / pj.w);
        }
    }
    gl.uniform4fv(P.comp.u.uSW, swU);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ---- FXAA to screen ----
    fxaa(ldrTex, w, h, R.cw, R.ch);
    bindTex(3, null);
    bindTex(4, null);
}
