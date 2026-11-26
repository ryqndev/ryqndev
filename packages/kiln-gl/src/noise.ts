import { rng } from '@ryqndev/kiln-math';

import { gl } from './context';
import { createTexture } from './texture';

/** Tileable RGBA noise: R = fbm height, GB = its gradient (for bump), A = white noise (sparkle). */
export function createNoiseTexture(): WebGLTexture {
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
                const L = (i: number, j: number) => tab[(((j % per) * 257 + (i % per)) * 31 + o * 4099) & 65535];
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
                H = (xx: number, yy: number) => (hgt[((yy + N) % N) * N + ((xx + N) % N)] - mn) / (mx - mn);
            d[i * 4] = H(x, y) * 255;
            d[i * 4 + 1] = Math.max(0, Math.min(255, 128 + (H(x + 1, y) - H(x - 1, y)) * 900));
            d[i * 4 + 2] = Math.max(0, Math.min(255, 128 + (H(x, y + 1) - H(x, y - 1)) * 900));
            d[i * 4 + 3] = Rn() * 255;
        }
    return createTexture(N, N, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, d, gl.LINEAR, gl.REPEAT, true);
}
