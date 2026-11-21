import { m4, m4mul, m4trs, TAU } from './math.js';

export let gl = null;
export const caps = {};

export function initGL(canvas) {
    gl = canvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
    });
    if (!gl) return null;
    caps.hdr = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    caps.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    return gl;
}

export function mkProg(vs, fs, defs = '') {
    const head = '#version 300 es\nprecision highp float;precision highp int;precision highp sampler2DShadow;\n' + defs + '\n';
    const p = gl.createProgram();
    for (const [t, s] of [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
    ]) {
        const sh = gl.createShader(t);
        gl.shaderSource(sh, head + s);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + s);
        gl.attachShader(p, sh);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
        const a = gl.getActiveUniform(p, i);
        u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name);
    }
    return { p, u };
}

export function mkTex(w, h, ifmt, fmt, type, data = null, filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE, mips = false) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (mips) {
        gl.generateMipmap(gl.TEXTURE_2D);
        if (caps.aniso) gl.texParameterf(gl.TEXTURE_2D, caps.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    }
    return t;
}

export function mkFbo(color, depth) {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    if (color) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
    else {
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
    }
    if (depth) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
    return f;
}

// ---------------------------------------------------------------------------
// Procedural geometry builder. Vertex = pos(3f) normal(4i8) color+kind(4u8) rough/metal/emis/ao(4u8)
// ---------------------------------------------------------------------------
const cof = (m) => {
    const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    const N = [e * i - f * h, c * h - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d];
    if (a * N[0] + d * N[1] + g * N[2] < 0) for (let k = 0; k < 9; k++) N[k] = -N[k];
    return N;
};

export class Geo {
    constructor() {
        this.v = [];
        this.i = [];
        this.n = 0;
        this.c = [0.8, 0.8, 0.8];
        this.k = 0;
        this.m = [0.6, 0, 0];
        this.ao = 1;
        this.aoFn = null;
        this.st = [{ m: m4(), n: [1, 0, 0, 0, 1, 0, 0, 0, 1] }];
    }
    push(x = 0, y = 0, z = 0, yaw = 0, pitch = 0, roll = 0, sx = 1, sy = sx, sz = sx) {
        const m = m4trs(m4(), x, y, z, yaw, pitch, roll, sx, sy, sz);
        m4mul(m, this.st[this.st.length - 1].m, m);
        this.st.push({ m, n: cof(m) });
        return this;
    }
    pushM(mat) {
        const m = m4();
        m4mul(m, this.st[this.st.length - 1].m, mat);
        this.st.push({ m, n: cof(m) });
        return this;
    }
    pop() {
        this.st.pop();
        return this;
    }
    col(r, g, b) {
        this.c = [r, g, b];
        return this;
    }
    mat(rough, metal = 0, emis = 0, kind = this.k) {
        this.m = [rough, metal, emis];
        this.k = kind;
        return this;
    }
    vert(x, y, z, nx, ny, nz) {
        const s = this.st[this.st.length - 1],
            m = s.m,
            N = s.n;
        const px = m[0] * x + m[4] * y + m[8] * z + m[12],
            py = m[1] * x + m[5] * y + m[9] * z + m[13],
            pz = m[2] * x + m[6] * y + m[10] * z + m[14];
        let qx = N[0] * nx + N[1] * ny + N[2] * nz,
            qy = N[3] * nx + N[4] * ny + N[5] * nz,
            qz = N[6] * nx + N[7] * ny + N[8] * nz;
        const l = Math.hypot(qx, qy, qz) || 1;
        qx /= l;
        qy /= l;
        qz /= l;
        const ao = this.aoFn ? this.aoFn(px, py, pz) * this.ao : this.ao;
        this.v.push(px, py, pz, qx, qy, qz, this.c[0], this.c[1], this.c[2], this.k, this.m[0], this.m[1], this.m[2], ao);
        return this.n++;
    }
    tri(a, b, c) {
        const v = this.v,
            A = a * 14,
            B = b * 14,
            C = c * 14;
        const ux = v[B] - v[A], uy = v[B + 1] - v[A + 1], uz = v[B + 2] - v[A + 2];
        const wx = v[C] - v[A], wy = v[C + 1] - v[A + 1], wz = v[C + 2] - v[A + 2];
        const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        if (nx * nx + ny * ny + nz * nz < 1e-14) return;
        const d = nx * (v[A + 3] + v[B + 3] + v[C + 3]) + ny * (v[A + 4] + v[B + 4] + v[C + 4]) + nz * (v[A + 5] + v[B + 5] + v[C + 5]);
        if (d < 0) this.i.push(a, c, b);
        else this.i.push(a, b, c);
    }
    quad(a, b, c, d) {
        this.tri(a, b, c);
        this.tri(a, c, d);
    }
    // chamfered box with weighted normals (reads as a rounded edge under specular light)
    box(hx, hy, hz, bv = 0.03) {
        bv = Math.min(bv, hx * 0.5, hy * 0.5, hz * 0.5);
        const h = [hx, hy, hz],
            base = this.n;
        for (let c = 0; c < 8; c++) {
            const s = [c & 1 ? 1 : -1, c & 2 ? 1 : -1, c & 4 ? 1 : -1];
            for (let a = 0; a < 3; a++) {
                const p = [0, 0, 0],
                    n = [0, 0, 0];
                for (let k = 0; k < 3; k++) p[k] = s[k] * (h[k] - (k === a ? 0 : bv));
                n[a] = s[a];
                this.vert(p[0], p[1], p[2], n[0], n[1], n[2]);
            }
        }
        const V = (c, a) => base + c * 3 + a;
        for (let a = 0; a < 3; a++) {
            const b = (a + 1) % 3,
                d = (a + 2) % 3;
            for (let s = 0; s < 2; s++) {
                const c0 = s << a;
                this.quad(V(c0, a), V(c0 | (1 << b), a), V(c0 | (1 << b) | (1 << d), a), V(c0 | (1 << d), a));
            }
        }
        for (let d = 0; d < 3; d++) {
            const a = (d + 1) % 3,
                b = (d + 2) % 3;
            for (let s = 0; s < 4; s++) {
                const c0 = ((s & 1) << a) | ((s >> 1) << b),
                    c1 = c0 | (1 << d);
                this.quad(V(c0, a), V(c0, b), V(c1, b), V(c1, a));
            }
        }
        for (let c = 0; c < 8; c++) this.tri(V(c, 0), V(c, 1), V(c, 2));
        return this;
    }
    // revolve profile [[r,y,nr,ny],...] around Y
    lathe(prof, seg = 16, arc = TAU) {
        const base = this.n,
            np = prof.length;
        for (let j = 0; j <= seg; j++) {
            const t = (j / seg) * arc,
                c = Math.cos(t),
                s = Math.sin(t);
            for (const p of prof) this.vert(p[0] * c, p[1], p[0] * s, p[2] * c, p[3], p[2] * s);
        }
        for (let j = 0; j < seg; j++)
            for (let k = 0; k < np - 1; k++) {
                const a = base + j * np + k,
                    b = a + np;
                this.tri(a, b, b + 1);
                this.tri(a, b + 1, a + 1);
            }
        return this;
    }
    // capped cylinder/cone, base at y=0
    cyl(r, h, seg = 16, bv = 0.03, r2 = r) {
        bv = Math.min(bv, r * 0.5, r2 * 0.5 || bv, h * 0.5);
        const sl = (r - r2) / h;
        return this.lathe(
            [
                [0, 0, 0, -1],
                [Math.max(r - bv, 0), 0, 0, -1],
                [r, bv, 1, sl],
                [r2, h - bv, 1, sl],
                [Math.max(r2 - bv, 0), h, 0, 1],
                [0, h, 0, 1],
            ],
            seg
        );
    }
    sphere(r, seg = 14, rings = 9) {
        const p = [];
        for (let i = 0; i <= rings; i++) {
            const a = (i / rings) * Math.PI - Math.PI / 2;
            p.push([Math.cos(a) * r, Math.sin(a) * r, Math.cos(a), Math.sin(a)]);
        }
        p[0][0] = p[rings][0] = 0;
        return this.lathe(p, seg);
    }
    // flat-shaded polygon (3 or 4 points), oriented away from (cx,cy,cz)
    flat(pts, cx = 0, cy = 0, cz = 0) {
        const [a, b, c] = pts;
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
        let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        const l = Math.hypot(nx, ny, nz);
        if (l < 1e-9) return this;
        nx /= l;
        ny /= l;
        nz /= l;
        let mx = 0, my = 0, mz = 0;
        for (const p of pts) {
            mx += p[0];
            my += p[1];
            mz += p[2];
        }
        const k = 1 / pts.length;
        if (nx * (mx * k - cx) + ny * (my * k - cy) + nz * (mz * k - cz) < 0) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
        }
        const id = pts.map((p) => this.vert(p[0], p[1], p[2], nx, ny, nz));
        this.tri(id[0], id[1], id[2]);
        if (id.length > 3) this.tri(id[0], id[2], id[3]);
        return this;
    }
    // faceted crystal standing on y=0, apex at y=h. tipB>0 adds a lower point (floating crystals)
    crystal(r, h, tip = h * 0.3, seg = 6, taper = 0.7, tipB = 0, R = null) {
        const lo = [],
            hi = [];
        const off = R ? R() * TAU : 0;
        for (let i = 0; i < seg; i++) {
            const a = (i / seg) * TAU + off,
                j = R ? 0.8 + R() * 0.4 : 1;
            lo.push([Math.cos(a) * r * taper * j, 0, Math.sin(a) * r * taper * j]);
            hi.push([Math.cos(a) * r * j, h - tip, Math.sin(a) * r * j]);
        }
        const cy = h * 0.5,
            top = [R ? (R() - 0.5) * r * 0.5 : 0, h, R ? (R() - 0.5) * r * 0.5 : 0];
        for (let i = 0; i < seg; i++) {
            const k = (i + 1) % seg;
            this.flat([lo[i], lo[k], hi[k], hi[i]], 0, cy, 0);
            this.flat([hi[i], hi[k], top], 0, cy, 0);
            if (tipB > 0) this.flat([lo[i], lo[k], [0, -tipB, 0]], 0, cy, 0);
        }
        return this;
    }
    build(instanced = false) {
        const n = this.n,
            buf = new ArrayBuffer(n * 24),
            f = new Float32Array(buf),
            b = new Int8Array(buf),
            u = new Uint8Array(buf),
            v = this.v;
        for (let i = 0; i < n; i++) {
            const o = i * 14,
                q = i * 24,
                w = i * 6;
            f[w] = v[o];
            f[w + 1] = v[o + 1];
            f[w + 2] = v[o + 2];
            b[q + 12] = v[o + 3] * 127;
            b[q + 13] = v[o + 4] * 127;
            b[q + 14] = v[o + 5] * 127;
            u[q + 16] = Math.min(255, v[o + 6] * 255);
            u[q + 17] = Math.min(255, v[o + 7] * 255);
            u[q + 18] = Math.min(255, v[o + 8] * 255);
            u[q + 19] = v[o + 9];
            u[q + 20] = Math.min(255, v[o + 10] * 255);
            u[q + 21] = Math.min(255, v[o + 11] * 255);
            u[q + 22] = Math.min(255, v[o + 12] * 255);
            u[q + 23] = Math.min(255, Math.max(0, v[o + 13]) * 255);
        }
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 4, gl.BYTE, true, 24, 12);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 24, 16);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, 24, 20);
        const ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.i), gl.STATIC_DRAW);
        if (instanced)
            for (let k = 4; k < 9; k++) {
                gl.enableVertexAttribArray(k);
                gl.vertexAttribDivisor(k, 1);
            }
        gl.bindVertexArray(null);
        return { vao, count: this.i.length, cap: 0, cnt: [0, 0], data: [null, null], off: [0, 0] };
    }
}

export function icoSphere(sub) {
    const t = (1 + Math.sqrt(5)) / 2;
    let P = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
    let I = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
    const norm = () => {
        for (let i = 0; i < P.length; i += 3) {
            const l = Math.hypot(P[i], P[i + 1], P[i + 2]);
            P[i] /= l;
            P[i + 1] /= l;
            P[i + 2] /= l;
        }
    };
    norm();
    for (let s = 0; s < sub; s++) {
        const cache = new Map(),
            J = [];
        const mid = (a, b) => {
            const key = a < b ? a * 65536 + b : b * 65536 + a;
            let m = cache.get(key);
            if (m === undefined) {
                m = P.length / 3;
                P.push((P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2);
                cache.set(key, m);
            }
            return m;
        };
        for (let i = 0; i < I.length; i += 3) {
            const a = I[i], b = I[i + 1], c = I[i + 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
            J.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
        }
        I = J;
        norm();
    }
    return { pos: new Float32Array(P), idx: new Uint16Array(I) };
}
