import { m4, m4aim, m4mul, m4trs, type Mat4, TAU } from '@ryqndev/rimefire-math';

import { gl } from '../gl/context';
import type { Mesh } from './mesh';

/** Material kinds a vertex can carry (Geo.mat's `kind`); the surface shader shades each differently. */
export const MATERIAL = {
    /** plain painted surface; takes the instance tint */
    PAINT: 0,
    /** island ground: sand, grass and rock chosen by height and slope */
    TERRAIN: 1,
    /** planking with seams */
    WOOD: 2,
    /** sailcloth: lit from both sides; takes the instance tint */
    CLOTH: 3,
    /** lanterns and windows: unlit, glows with the environment's lamp level */
    EMISSIVE: 4,
    METAL: 5,
    /** foliage: soft wrapped lighting */
    LEAF: 6,
} as const;

// ---------------------------------------------------------------------------
// Procedural geometry builder. Vertex = pos(3f) normal+sway(4i8) color+kind(4u8) rough/metal/emis/ao(4u8)
// ---------------------------------------------------------------------------
// cofactor matrix of the upper 3x3: transforms normals correctly under non-uniform scale
const cof = (m: Mat4) => {
    const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    const N = [e * i - f * h, c * h - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d];
    if (a * N[0] + d * N[1] + g * N[2] < 0) for (let k = 0; k < 9; k++) N[k] = -N[k];
    return N;
};

const NO_INSTANCES = new Float32Array(0);
/** floats per vertex in the builder's scratch array */
const VERT = 15;

interface Xform {
    m: Mat4;
    /** normal matrix (row-major 3x3) */
    n: number[];
}

export type Point = number[];

/**
 * Smooth normals for a grid of points (rows x columns), taken from each point's neighbours and
 * flipped to agree with `out`, a rough outward direction at that point.
 */
export function gridNormals(P: Point[][], out: (p: Point) => Point): Point[][] {
    const rows = P.length,
        cols = P[0].length;
    return P.map((row, i) =>
        row.map((p, j) => {
            const a = P[Math.min(rows - 1, i + 1)][j],
                b = P[Math.max(0, i - 1)][j],
                c = row[Math.min(cols - 1, j + 1)],
                d = row[Math.max(0, j - 1)];
            const ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2], vx = c[0] - d[0], vy = c[1] - d[1], vz = c[2] - d[2];
            let nx = uy * vz - uz * vy,
                ny = uz * vx - ux * vz,
                nz = ux * vy - uy * vx;
            const l = Math.hypot(nx, ny, nz),
                o = out(p);
            if (l < 1e-9) return o;
            const s = nx * o[0] + ny * o[1] + nz * o[2] < 0 ? -1 / l : 1 / l;
            nx *= s;
            ny *= s;
            nz *= s;
            return [nx, ny, nz];
        })
    );
}

export class Geo {
    /** VERT floats per vertex: position, normal, colour, kind, roughness, metalness, emissive, ao, sway */
    v: number[] = [];
    i: number[] = [];
    n = 0;
    /** current colour, material kind and [roughness, metalness, emissive] */
    c: number[] = [0.8, 0.8, 0.8];
    k = 0;
    m: number[] = [0.6, 0, 0];
    ao = 1;
    /** 0..1: how far the wind moves the vertices added next (flags, palm fronds, loose canvas) */
    sway = 0;
    /** optional per-vertex ambient occlusion, evaluated on the transformed position */
    aoFn: ((x: number, y: number, z: number) => number) | null = null;
    /** transform stack */
    st: Xform[] = [{ m: m4(), n: [1, 0, 0, 0, 1, 0, 0, 0, 1] }];
    push(x = 0, y = 0, z = 0, yaw = 0, pitch = 0, roll = 0, sx = 1, sy = sx, sz = sx) {
        const m = m4trs(m4(), x, y, z, yaw, pitch, roll, sx, sy, sz);
        m4mul(m, this.st[this.st.length - 1].m, m);
        this.st.push({ m, n: cof(m) });
        return this;
    }
    pushM(mat: Mat4) {
        const m = m4();
        m4mul(m, this.st[this.st.length - 1].m, mat);
        this.st.push({ m, n: cof(m) });
        return this;
    }
    pop() {
        this.st.pop();
        return this;
    }
    col(r: number, g: number, b: number) {
        this.c = [r, g, b];
        return this;
    }
    mat(rough: number, metal = 0, emis = 0, kind = this.k) {
        this.m = [rough, metal, emis];
        this.k = kind;
        return this;
    }
    vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, sway = this.sway) {
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
        this.v.push(px, py, pz, qx, qy, qz, this.c[0], this.c[1], this.c[2], this.k, this.m[0], this.m[1], this.m[2], ao, sway);
        return this.n++;
    }
    tri(a: number, b: number, c: number) {
        const v = this.v,
            A = a * VERT,
            B = b * VERT,
            C = c * VERT;
        const ux = v[B] - v[A], uy = v[B + 1] - v[A + 1], uz = v[B + 2] - v[A + 2];
        const wx = v[C] - v[A], wy = v[C + 1] - v[A + 1], wz = v[C + 2] - v[A + 2];
        const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        if (nx * nx + ny * ny + nz * nz < 1e-14) return;
        const d = nx * (v[A + 3] + v[B + 3] + v[C + 3]) + ny * (v[A + 4] + v[B + 4] + v[C + 4]) + nz * (v[A + 5] + v[B + 5] + v[C + 5]);
        if (d < 0) this.i.push(a, c, b);
        else this.i.push(a, b, c);
    }
    quad(a: number, b: number, c: number, d: number) {
        this.tri(a, b, c);
        this.tri(a, c, d);
    }
    // chamfered box with weighted normals (reads as a rounded edge under specular light)
    box(hx: number, hy: number, hz: number, bv = 0.03) {
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
        const V = (c: number, a: number) => base + c * 3 + a;
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
    lathe(prof: number[][], seg = 16, arc = TAU) {
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
    cyl(r: number, h: number, seg = 16, bv = 0.03, r2 = r) {
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
    /** Round spar from point a to point b, tapering from radius r to r2. */
    strut(a: Point, b: Point, r: number, r2 = r, seg = 6) {
        const dx = b[0] - a[0],
            dy = b[1] - a[1],
            dz = b[2] - a[2];
        return this.pushM(m4aim(m4(), a[0], a[1], a[2], dx, dy, dz)).cyl(r, Math.hypot(dx, dy, dz), seg, 0, r2).pop();
    }
    sphere(r: number, seg = 14, rings = 9) {
        const p = [];
        for (let i = 0; i <= rings; i++) {
            const a = (i / rings) * Math.PI - Math.PI / 2;
            p.push([Math.cos(a) * r, Math.sin(a) * r, Math.cos(a), Math.sin(a)]);
        }
        p[0][0] = p[rings][0] = 0;
        return this.lathe(p, seg);
    }
    // flat-shaded polygon (3 or 4 points), oriented away from (cx,cy,cz)
    flat(pts: Point[], cx = 0, cy = 0, cz = 0) {
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
    /**
     * Smooth skin over a grid of points with the given normals (see gridNormals), restricted to
     * columns c0..c1. `sway` optionally gives a wind weight per point.
     */
    skin(P: Point[][], N: Point[][], c0 = 0, c1 = P[0].length - 1, sway?: (row: number, col: number) => number) {
        const base = this.n,
            cols = c1 - c0 + 1;
        for (let i = 0; i < P.length; i++)
            for (let j = c0; j <= c1; j++) {
                const p = P[i][j],
                    n = N[i][j];
                this.vert(p[0], p[1], p[2], n[0], n[1], n[2], sway ? sway(i, j) : this.sway);
            }
        for (let i = 0; i < P.length - 1; i++)
            for (let j = 0; j < cols - 1; j++) {
                const a = base + i * cols + j;
                this.tri(a, a + cols, a + cols + 1);
                this.tri(a, a + cols + 1, a + 1);
            }
        return this;
    }
    build(instanced = false): Mesh {
        const n = this.n,
            buf = new ArrayBuffer(n * 24),
            f = new Float32Array(buf),
            b = new Int8Array(buf),
            u = new Uint8Array(buf),
            v = this.v;
        for (let i = 0; i < n; i++) {
            const o = i * VERT,
                q = i * 24,
                w = i * 6;
            f[w] = v[o];
            f[w + 1] = v[o + 1];
            f[w + 2] = v[o + 2];
            b[q + 12] = v[o + 3] * 127;
            b[q + 13] = v[o + 4] * 127;
            b[q + 14] = v[o + 5] * 127;
            b[q + 15] = Math.min(1, Math.max(0, v[o + 14])) * 127;
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
            for (let k = 4; k < 8; k++) {
                gl.enableVertexAttribArray(k);
                gl.vertexAttribDivisor(k, 1);
            }
        gl.bindVertexArray(null);
        return { vao, count: this.i.length, cnt: 0, data: NO_INSTANCES, off: 0 };
    }
}
