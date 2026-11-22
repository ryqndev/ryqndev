/** Unit icosphere; positions double as normals. */
export function icoSphere(sub: number): { pos: Float32Array; idx: Uint16Array } {
    const t = (1 + Math.sqrt(5)) / 2;
    const P = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
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
        const mid = (a: number, b: number) => {
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
