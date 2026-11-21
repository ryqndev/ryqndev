export const PI = Math.PI,
    TAU = PI * 2;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
    x = sat((x - a) / (b - a));
    return x * x * (3 - 2 * x);
};
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const rnds = (a = 1) => (Math.random() * 2 - 1) * a;
export const hyp = Math.hypot;

export function rng(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const angDiff = (a, b) => {
    let d = (b - a) % TAU;
    if (d > PI) d -= TAU;
    if (d < -PI) d += TAU;
    return d;
};

const h2 = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
};
export function vnoise(x, y) {
    const xi = Math.floor(x),
        yi = Math.floor(y),
        xf = x - xi,
        yf = y - yi;
    const u = xf * xf * (3 - 2 * xf),
        v = yf * yf * (3 - 2 * yf);
    const a = h2(xi, yi),
        b = h2(xi + 1, yi),
        c = h2(xi, yi + 1),
        d = h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, o = 4) {
    let s = 0,
        a = 0.5,
        f = 1;
    for (let i = 0; i < o; i++) {
        s += a * vnoise(x * f, y * f);
        f *= 2.03;
        a *= 0.5;
    }
    return s;
}

// ---- mat4 (column-major Float32Array) ----
export const m4 = () => {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
};
export function m4persp(o, fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2);
    o.fill(0);
    o[0] = t / asp;
    o[5] = t;
    o[10] = (f + n) / (n - f);
    o[11] = -1;
    o[14] = (2 * f * n) / (n - f);
    return o;
}
export function m4ortho(o, l, r, b, t, n, f) {
    o.fill(0);
    o[0] = 2 / (r - l);
    o[5] = 2 / (t - b);
    o[10] = -2 / (f - n);
    o[12] = -(r + l) / (r - l);
    o[13] = -(t + b) / (t - b);
    o[14] = -(f + n) / (f - n);
    o[15] = 1;
    return o;
}
export function m4mul(o, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let i = 0; i < 4; i++) {
        const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
        o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    }
    return o;
}
export function m4inv(o, m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
}
// T * Ry(yaw) * Rx(pitch) * Rz(roll) * S. yaw=0 faces -Z, +yaw turns left, +pitch looks up.
export function m4trs(o, x, y, z, yaw = 0, pitch = 0, roll = 0, sx = 1, sy = sx, sz = sx) {
    const cy = Math.cos(yaw), sY = Math.sin(yaw), cx = Math.cos(pitch), sX = Math.sin(pitch), cz = Math.cos(roll), sZ = Math.sin(roll);
    o[0] = (cy * cz + sY * sX * sZ) * sx;
    o[1] = cx * sZ * sx;
    o[2] = (-sY * cz + cy * sX * sZ) * sx;
    o[3] = 0;
    o[4] = (-cy * sZ + sY * sX * cz) * sy;
    o[5] = cx * cz * sy;
    o[6] = (sY * sZ + cy * sX * cz) * sy;
    o[7] = 0;
    o[8] = sY * cx * sz;
    o[9] = -sX * sz;
    o[10] = cy * cx * sz;
    o[11] = 0;
    o[12] = x;
    o[13] = y;
    o[14] = z;
    o[15] = 1;
    return o;
}
// build a matrix whose +Y axis points along (dx,dy,dz), positioned at x,y,z
export function m4aim(o, x, y, z, dx, dy, dz, sx = 1, sy = sx, sz = sx) {
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l;
    dy /= l;
    dz /= l;
    let tx, ty, tz;
    if (Math.abs(dy) < 0.99) {
        tx = dz;
        ty = 0;
        tz = -dx;
    } else {
        tx = 1;
        ty = 0;
        tz = 0;
    }
    const tl = Math.hypot(tx, ty, tz);
    tx /= tl;
    ty /= tl;
    tz /= tl;
    const bx = ty * dz - tz * dy,
        by = tz * dx - tx * dz,
        bz = tx * dy - ty * dx;
    o[0] = tx * sx;
    o[1] = ty * sx;
    o[2] = tz * sx;
    o[3] = 0;
    o[4] = dx * sy;
    o[5] = dy * sy;
    o[6] = dz * sy;
    o[7] = 0;
    o[8] = bx * sz;
    o[9] = by * sz;
    o[10] = bz * sz;
    o[11] = 0;
    o[12] = x;
    o[13] = y;
    o[14] = z;
    o[15] = 1;
    return o;
}
