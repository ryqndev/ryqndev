import { gl, caps, mkProg, mkTex, mkFbo, icoSphere } from './gl.js';
import * as SH from './shaders.js';
import { m4, m4ortho, m4mul, m4inv, m4trs, m4persp, rng } from './math.js';
import { W } from './world.js';
import { S, gpu, pcount, lightU } from './fx.js';

export const R = { w: 0, h: 0, cw: 0, ch: 0, quality: 2, dyn: 1, ao: true, canvas: null };
export const SUN = [0.42, 0.5, 0.757];
const SUNCOL = [0.5, 0.68, 1.05],
    FOG = [0.04, 0.062, 0.09, 0.0105];
const SM = 2048,
    SHR = 50,
    NEAR = 0.1,
    FAR = 700;
export const cam = {
    x: 0, y: 2, z: 0, view: m4(), proj: m4(), vp: m4(), vmProj: m4(), vmVP: m4(), sky: m4(),
    rx: 1, ry: 0, rz: 0, ux: 0, uy: 1, uz: 0, fx: 0, fy: 0, fz: -1, fov: 1.4, near: NEAR, far: FAR,
};
export const post = { exposure: 1.15, bloom: 0.055, vig: 0.85, dmg: 0, ca: 0, desat: 0, flash: 0 };

const P = {};
let tri, quad, noiseTex, shadowTex, shadowFbo, hdrTex, depthTex, hdrFbo, hdrFboND, ldrTex, ldrFbo, scorchTex, scorchFbo;
let bloom = [],
    aoT = [],
    aoF = [];
let instBuf,
    instCap = 0,
    instData = new Float32Array(20 * 256);
let gooVao, gooBuf, gooIdx, partVao, partBuf, snowVao;
const SNOWN = 1500;
export const goo = { data: new Float32Array(1000 * 12), n: 0 };
const meshes = [];
const shadowM = m4(),
    lightVP = m4(),
    tmp = m4(),
    tmp2 = m4();
let scorchT = 0;

export function regMesh(g) {
    const m = g.build(true);
    m.data = [new Float32Array(20 * 8), new Float32Array(20 * 4)];
    meshes.push(m);
    return m;
}
export function addInst(m, mat, r = 1, g = 1, b = 1, flash = 0, emis = 1, diss = 0, layer = 0) {
    let d = m.data[layer];
    const n = m.cnt[layer];
    if ((n + 1) * 20 > d.length) {
        const nd = new Float32Array(d.length * 2);
        nd.set(d);
        d = m.data[layer] = nd;
    }
    const o = n * 20;
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

function makeNoise() {
    const N = 256,
        Rn = rng(1337),
        tab = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) tab[i] = Rn();
    const hgt = new Float32Array(N * N);
    let mn = 9,
        mx = -9;
    for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
            let s = 0,
                a = 0.5,
                per = 8;
            for (let o = 0; o < 5; o++) {
                const fx = (x / N) * per,
                    fy = (y / N) * per,
                    xi = fx | 0,
                    yi = fy | 0,
                    u = fx - xi,
                    v = fy - yi,
                    uu = u * u * (3 - 2 * u),
                    vv = v * v * (3 - 2 * v);
                const L = (i, j) => tab[(((j % per) * 257 + (i % per)) * 31 + o * 4099) & 65535];
                const p = L(xi, yi),
                    q = L(xi + 1, yi),
                    r = L(xi, yi + 1),
                    t = L(xi + 1, yi + 1);
                s += a * (p + (q - p) * uu + (r - p) * vv + (p - q - r + t) * uu * vv);
                a *= 0.5;
                per *= 2;
            }
            hgt[y * N + x] = s;
            if (s < mn) mn = s;
            if (s > mx) mx = s;
        }
    const d = new Uint8Array(N * N * 4);
    for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
            const i = y * N + x,
                H = (xx, yy) => (hgt[((yy + N) % N) * N + ((xx + N) % N)] - mn) / (mx - mn);
            d[i * 4] = H(x, y) * 255;
            d[i * 4 + 1] = Math.max(0, Math.min(255, 128 + (H(x + 1, y) - H(x - 1, y)) * 900));
            d[i * 4 + 2] = Math.max(0, Math.min(255, 128 + (H(x, y + 1) - H(x, y - 1)) * 900));
            d[i * 4 + 3] = Rn() * 255;
        }
    return mkTex(N, N, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, d, gl.LINEAR, gl.REPEAT, true);
}

export function initRenderer(canvas) {
    R.canvas = canvas;
    P.uberS = mkProg(SH.UBER_VS, SH.UBER_FS);
    P.uberI = mkProg(SH.UBER_VS, SH.UBER_FS, '#define INST');
    P.shS = mkProg(SH.SHADOW_VS, SH.SHADOW_FS);
    P.shI = mkProg(SH.SHADOW_VS, SH.SHADOW_FS, '#define INST');
    P.goo = mkProg(SH.GOO_VS, SH.GOO_FS);
    P.part = mkProg(SH.PART_VS, SH.PART_FS);
    P.snow = mkProg(SH.SNOW_VS, SH.SNOW_FS);
    P.sky = mkProg(SH.SKY_VS, SH.SKY_FS);
    P.downK = mkProg(SH.FS_VS, SH.DOWN_FS, '#define KARIS');
    P.down = mkProg(SH.FS_VS, SH.DOWN_FS);
    P.up = mkProg(SH.FS_VS, SH.UP_FS);
    P.comp = mkProg(SH.FS_VS, SH.COMP_FS);
    P.fxaa = mkProg(SH.FS_VS, SH.FXAA_FS);
    P.ao = mkProg(SH.FS_VS, SH.AO_FS);
    P.aoBlur = mkProg(SH.FS_VS, SH.AOBLUR_FS);
    P.aoApply = mkProg(SH.FS_VS, SH.AOAPPLY_FS);
    P.stamp = mkProg(SH.STAMP_VS, SH.STAMP_FS);
    P.flat = mkProg(SH.FS_VS, SH.FLAT_FS);

    const mkQ = (data) => {
        const v = gl.createVertexArray();
        gl.bindVertexArray(v);
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        return [v, b];
    };
    tri = mkQ([-1, -1, 3, -1, -1, 3])[0];
    quad = mkQ([-1, -1, 1, -1, -1, 1, 1, 1])[0];

    noiseTex = makeNoise();
    shadowTex = mkTex(SM, SM, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    shadowFbo = mkFbo(null, shadowTex);
    scorchTex = mkTex(512, 512, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null);
    scorchFbo = mkFbo(scorchTex, null);
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
    gl.bufferData(gl.ARRAY_BUFFER, goo.data.byteLength, gl.DYNAMIC_DRAW);
    for (let k = 0; k < 3; k++) {
        gl.enableVertexAttribArray(4 + k);
        gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, 48, k * 16);
        gl.vertexAttribDivisor(4 + k, 1);
    }

    // particles
    const pq = mkQ([-1, -1, 1, -1, -1, 1, 1, 1]);
    partVao = pq[0];
    partBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, partBuf);
    gl.bufferData(gl.ARRAY_BUFFER, gpu.byteLength, gl.DYNAMIC_DRAW);
    for (let k = 0; k < 4; k++) {
        gl.enableVertexAttribArray(1 + k);
        gl.vertexAttribPointer(1 + k, 4, gl.FLOAT, false, 64, k * 16);
        gl.vertexAttribDivisor(1 + k, 1);
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

function alloc(w, h) {
    for (const t of [hdrTex, depthTex, ldrTex, ...bloom.map((b) => b.t), ...aoT]) if (t) gl.deleteTexture(t);
    for (const f of [hdrFbo, hdrFboND, ldrFbo, ...bloom.map((b) => b.f), ...aoF]) if (f) gl.deleteFramebuffer(f);
    const I = caps.hdr ? gl.RGBA16F : gl.RGBA8,
        Ty = caps.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    hdrTex = mkTex(w, h, I, gl.RGBA, Ty);
    depthTex = mkTex(w, h, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null, gl.NEAREST);
    hdrFbo = mkFbo(hdrTex, depthTex);
    hdrFboND = mkFbo(hdrTex, null);
    ldrTex = mkTex(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    ldrFbo = mkFbo(ldrTex, null);
    bloom = [];
    let bw = w >> 1,
        bh = h >> 1;
    for (let i = 0; i < 6 && bw > 8 && bh > 8; i++) {
        const t = mkTex(bw, bh, I, gl.RGBA, Ty);
        bloom.push({ t, f: mkFbo(t, null), w: bw, h: bh });
        bw >>= 1;
        bh >>= 1;
    }
    aoT = [];
    aoF = [];
    for (let i = 0; i < 2; i++) {
        aoT[i] = mkTex(w >> 1, h >> 1, gl.R8, gl.RED, gl.UNSIGNED_BYTE);
        aoF[i] = mkFbo(aoT[i], null);
    }
    R.w = w;
    R.h = h;
}

export function resize() {
    const c = R.canvas,
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

function common(p) {
    const u = p.u;
    gl.uniform3f(u.uCam, cam.x, cam.y, cam.z);
    gl.uniform3fv(u.uSunDir, SUN);
    gl.uniform3fv(u.uSunCol, SUNCOL);
    gl.uniform4fv(u.uLP, lightU.pos);
    gl.uniform3fv(u.uLC, lightU.col);
    gl.uniform1i(u.uLN, lightU.n);
    gl.uniform1f(u.uTime, S.t);
    gl.uniformMatrix4fv(u.uShadowM, false, shadowM);
    gl.uniform4fv(u.uFog, FOG);
    gl.uniform1i(u.uNoise, 0);
    gl.uniform1i(u.uShadow, 1);
    gl.uniform1i(u.uScorch, 2);
}
function drawInst(layer) {
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
function bindTex(unit, t) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
}
function fsPass(p, fbo, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(p.p);
    gl.bindVertexArray(tri);
}

// world position -> css pixels. returns false when behind the camera
export function project(x, y, z, out) {
    const m = cam.vp,
        w = m[3] * x + m[7] * y + m[11] * z + m[15];
    out.x = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / Math.abs(w)) * 0.5 + 0.5;
    out.y = 0.5 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / Math.abs(w)) * 0.5;
    out.w = w;
    return w > 0;
}

const pj = { x: 0, y: 0, w: 0 },
    swU = new Float32Array(16);

export function render(dt) {
    // ---- upload instance data ----
    let total = 0;
    for (const m of meshes) total += m.cnt[0] + m.cnt[1];
    if (total * 20 > instData.length) instData = new Float32Array(total * 40);
    let o = 0;
    for (const m of meshes)
        for (let l = 0; l < 2; l++) {
            m.off[l] = o;
            const n = m.cnt[l] * 20;
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
    if (goo.n) gl.bufferSubData(gl.ARRAY_BUFFER, 0, goo.data, 0, goo.n * 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, partBuf);
    if (pcount.n) gl.bufferSubData(gl.ARRAY_BUFFER, 0, gpu, 0, pcount.n * 16);

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
    gl.useProgram(P.shS.p);
    gl.uniformMatrix4fv(P.shS.u.uVP, false, lightVP);
    gl.bindVertexArray(W.mesh.props.vao);
    gl.drawElements(gl.TRIANGLES, W.mesh.props.count, gl.UNSIGNED_INT, 0);
    gl.useProgram(P.shI.p);
    gl.uniformMatrix4fv(P.shI.u.uVP, false, lightVP);
    drawInst(0);
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // ---- scorch map ----
    if (S.stamps.length || (scorchT += dt) > 0.1) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, scorchFbo);
        gl.viewport(0, 0, 512, 512);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        if (S.stamps.length) {
            gl.useProgram(P.stamp.p);
            bindTex(0, noiseTex);
            gl.uniform1i(P.stamp.u.uNoise, 0);
            gl.bindVertexArray(quad);
            for (let i = 0; i < S.stamps.length; i += 5) {
                gl.uniform4f(P.stamp.u.uR, S.stamps[i] / 64, S.stamps[i + 1] / 64, S.stamps[i + 2] / 64, 0);
                gl.uniform4f(P.stamp.u.uCol, S.stamps[i + 3], S.stamps[i + 4], 0, 0);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            S.stamps.length = 0;
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
    gl.useProgram(P.uberS.p);
    common(P.uberS);
    gl.uniformMatrix4fv(P.uberS.u.uVP, false, cam.vp);
    gl.bindVertexArray(W.mesh.props.vao);
    gl.drawElements(gl.TRIANGLES, W.mesh.props.count, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(W.mesh.terrain.vao);
    gl.drawElements(gl.TRIANGLES, W.mesh.terrain.count, gl.UNSIGNED_INT, 0);
    gl.useProgram(P.uberI.p);
    common(P.uberI);
    gl.uniformMatrix4fv(P.uberI.u.uVP, false, cam.vp);
    drawInst(0);
    if (goo.n) {
        gl.useProgram(P.goo.p);
        common(P.goo);
        gl.uniformMatrix4fv(P.goo.u.uVP, false, cam.vp);
        gl.bindVertexArray(gooVao);
        gl.drawElementsInstanced(gl.TRIANGLES, gooIdx, gl.UNSIGNED_SHORT, 0, goo.n);
    }
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.useProgram(P.sky.p);
    gl.uniformMatrix4fv(P.sky.u.uIVP, false, cam.sky);
    gl.uniform3fv(P.sky.u.uSunDir, SUN);
    gl.uniform1f(P.sky.u.uTime, S.t);
    gl.uniform4fv(P.sky.u.uFog, FOG);
    gl.uniform1i(P.sky.u.uNoise, 0);
    gl.bindVertexArray(tri);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
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

    // ---- particles + snow (manual depth test against the scene) ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFboND);
    gl.viewport(0, 0, w, h);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P.snow.p);
    gl.uniformMatrix4fv(P.snow.u.uVP, false, cam.vp);
    gl.uniform3f(P.snow.u.uCam, cam.x, cam.y, cam.z);
    gl.uniform1f(P.snow.u.uTime, S.t);
    gl.uniform1i(P.snow.u.uDepth, 3);
    gl.uniform2f(P.snow.u.uNF, NEAR, FAR);
    gl.uniform3f(P.snow.u.uCol, 0.5, 0.62, 0.8);
    gl.bindVertexArray(snowVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, SNOWN);
    if (pcount.n) {
        gl.useProgram(P.part.p);
        gl.uniformMatrix4fv(P.part.u.uVP, false, cam.vp);
        gl.uniform3f(P.part.u.uCR, cam.rx, cam.ry, cam.rz);
        gl.uniform3f(P.part.u.uCU, cam.ux, cam.uy, cam.uz);
        gl.uniform3f(P.part.u.uCam, cam.x, cam.y, cam.z);
        gl.uniform1i(P.part.u.uDepth, 3);
        gl.uniform1i(P.part.u.uNoise, 0);
        gl.uniform2f(P.part.u.uNF, NEAR, FAR);
        gl.bindVertexArray(partVao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, pcount.n);
    }
    gl.disable(gl.BLEND);

    // ---- first-person viewmodel (own projection, compressed depth range) ----
    bindTex(3, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFbo);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.depthRange(0, 0.06);
    gl.useProgram(P.uberI.p);
    gl.uniformMatrix4fv(P.uberI.u.uVP, false, cam.vmVP);
    drawInst(1);
    gl.depthRange(0, 1);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    for (const m of meshes) m.cnt[0] = m.cnt[1] = 0;

    // ---- bloom ----
    let src = hdrTex,
        sw = w,
        sh = h;
    for (let i = 0; i < bloom.length; i++) {
        const b = bloom[i],
            p = i ? P.down : P.downK;
        fsPass(p, b.f, b.w, b.h);
        bindTex(3, src);
        gl.uniform1i(p.u.uT, 3);
        gl.uniform2f(p.u.uPx, 1 / sw, 1 / sh);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        src = b.t;
        sw = b.w;
        sh = b.h;
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = bloom.length - 1; i > 0; i--) {
        const b = bloom[i],
            d = bloom[i - 1];
        fsPass(P.up, d.f, d.w, d.h);
        bindTex(3, b.t);
        gl.uniform1i(P.up.u.uT, 3);
        gl.uniform2f(P.up.u.uPx, 0.5 / b.w, 0.5 / b.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);

    // ---- composite ----
    fsPass(P.comp, ldrFbo, w, h);
    bindTex(3, hdrTex);
    bindTex(4, bloom[0].t);
    gl.uniform1i(P.comp.u.uT, 3);
    gl.uniform1i(P.comp.u.uBloom, 4);
    gl.uniform4f(P.comp.u.uP, post.exposure, post.bloom, post.vig, (S.t * 61.7) % 97);
    gl.uniform4f(P.comp.u.uFx, post.dmg, post.ca, post.desat, post.flash);
    gl.uniform1f(P.comp.u.uAspect, w / h);
    swU.fill(0);
    for (let i = S.sw.length - 1; i >= 0; i--) {
        const s = S.sw[i];
        s.t += dt;
        if (s.t > 0.55) {
            S.sw.splice(i, 1);
            continue;
        }
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
    fsPass(P.fxaa, null, R.cw, R.ch);
    bindTex(3, ldrTex);
    gl.uniform1i(P.fxaa.u.uT, 3);
    gl.uniform2f(P.fxaa.u.uPx, 1 / w, 1 / h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    bindTex(3, null);
    bindTex(4, null);
}

// camera matrices from position + orientation
const camW = m4(),
    rot = m4();
export function setCamera(x, y, z, yaw, pitch, roll, fov) {
    cam.x = x;
    cam.y = y;
    cam.z = z;
    cam.fov = fov;
    m4trs(camW, x, y, z, yaw, pitch, roll);
    cam.world = camW;
    cam.rx = camW[0];
    cam.ry = camW[1];
    cam.rz = camW[2];
    cam.ux = camW[4];
    cam.uy = camW[5];
    cam.uz = camW[6];
    cam.fx = -camW[8];
    cam.fy = -camW[9];
    cam.fz = -camW[10];
    m4inv(cam.view, camW);
    const asp = R.w / R.h;
    m4persp(cam.proj, fov, asp, NEAR, FAR);
    m4mul(cam.vp, cam.proj, cam.view);
    m4persp(cam.vmProj, 0.92, asp, 0.03, 20);
    m4mul(cam.vmVP, cam.vmProj, cam.view);
    rot.set(cam.view);
    rot[12] = rot[13] = rot[14] = 0;
    m4mul(tmp, cam.proj, rot);
    m4inv(cam.sky, tmp);
    return camW;
}
