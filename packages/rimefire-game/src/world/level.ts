import { clamp, m4, m4aim, PI, rng, TAU } from '@ryqndev/kiln-math';
import { Geo, MATERIAL, SHADOW_NONE } from '@ryqndev/rimefire-renderer';

import { addBox, addCyl } from './colliders';
import { bakeHeightmap, height, PYL } from './terrain';
import { W } from './world';

// Procedurally builds the whole level: terrain mesh, static props, colliders, lights and objectives.
export function buildWorld() {
    bakeHeightmap();
    const R = rng(90210);
    const rr = (a: number, b: number) => a + R() * (b - a);

    // ---- terrain ----
    const T = new Geo();
    T.mat(0.8, 0, 0, 1).col(1, 1, 1);
    const TN = 176,
        wp = (u: number) => 62 * u + 200 * u * u * u;
    for (let j = 0; j <= TN; j++)
        for (let i = 0; i <= TN; i++) {
            const u = (i / TN) * 2 - 1,
                v = (j / TN) * 2 - 1,
                x = wp(u),
                z = wp(v),
                e = Math.max(0.4, (62 + 600 * Math.max(u * u, v * v)) / TN);
            const h = height(x, z);
            T.vert(x, h, z, height(x - e, z) - height(x + e, z), 2 * e, height(x, z - e) - height(x, z + e));
        }
    for (let j = 0; j < TN; j++)
        for (let i = 0; i < TN; i++) {
            const a = j * (TN + 1) + i;
            T.i.push(a, a + TN + 1, a + 1, a + 1, a + TN + 1, a + TN + 2);
        }
    const terrain = T.build();

    // ---- static props ----
    const G = new Geo();
    G.aoFn = (x: number, y: number, z: number) => 0.45 + 0.55 * clamp((y - height(x, z)) / 1.3, 0, 1);
    // footprints already used, as [x, z, radius]
    const taken: number[][] = [];
    const free = (x: number, z: number, r: number) => {
        if (Math.hypot(x, z) < 13 + r) return false;
        for (const t of taken) if (Math.hypot(x - t[0], z - t[1]) < r + t[2]) return false;
        return true;
    };
    for (const p of PYL) taken.push([p[0], p[1], 7]);
    taken.push([0, -50, 7]);

    // hub pad + ring lamps
    G.mat(0.75, 0.1, 0, MATERIAL.CONCRETE).col(0.2, 0.21, 0.23);
    G.push(0, -0.3, 0).lathe([[0, 0.55, 0, 1], [8.3, 0.55, 0, 1], [8.6, 0.5, 0.5, 1], [9.4, 0, 1, 0.6]], 40).pop();
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        G.mat(0.4, 0.6, 0, 0).col(0.15, 0.16, 0.18).push(Math.cos(a) * 7.5, 0.25, Math.sin(a) * 7.5, -a).box(0.22, 0.07, 0.12, 0.02);
        G.mat(0.3, 0, 0.12, 4).col(1, 0.5, 0.15).push(0, 0.06, 0).box(0.14, 0.03, 0.06, 0.01).pop().pop();
        G.mat(0.6, 0.2, 0, 0).col(i % 2 ? 0.55 : 0.1, i % 2 ? 0.42 : 0.1, 0.06).push(Math.cos(a) * 5.6, 0.24, Math.sin(a) * 5.6, -a).box(0.5, 0.03, 0.42, 0.01).pop();
    }
    addCyl(0, 0, 8.7, -2, 0.25);

    // containers
    const pal = [[0.5, 0.17, 0.1], [0.1, 0.28, 0.34], [0.56, 0.4, 0.1], [0.27, 0.3, 0.33], [0.42, 0.43, 0.45], [0.12, 0.17, 0.3], [0.5, 0.17, 0.1], [0.1, 0.28, 0.34]];
    function container(x: number, z: number, yaw: number, col: number[], y0?: number) {
        const y = y0 === undefined ? height(x, z) - 0.06 : y0;
        G.push(x, y + 1.295, z, yaw);
        G.mat(0.5, 0.25, 0, 0).col(col[0], col[1], col[2]);
        G.box(2.99, 1.26, 1.18, 0.02);
        G.col(col[0] * 0.75, col[1] * 0.75, col[2] * 0.75);
        for (let sx = -1; sx <= 1; sx += 2)
            for (let sz = -1; sz <= 1; sz += 2) G.push(sx * 2.97, 0, sz * 1.16).box(0.07, 1.295, 0.07, 0.015).pop();
        for (let sy = -1; sy <= 1; sy += 2) {
            for (let sz = -1; sz <= 1; sz += 2) G.push(0, sy * 1.24, sz * 1.17).box(3.03, 0.055, 0.055, 0.012).pop();
            for (let sx = -1; sx <= 1; sx += 2) G.push(sx * 2.98, sy * 1.24, 0).box(0.055, 0.055, 1.22, 0.012).pop();
        }
        G.col(col[0], col[1], col[2]);
        for (let i = 0; i < 17; i++) {
            const px = -2.72 + i * 0.34;
            for (let sz = -1; sz <= 1; sz += 2) G.push(px, 0, sz * 1.19).box(0.085, 1.16, 0.035, 0.03).pop();
        }
        for (let i = 0; i < 6; i++) G.push(-2.99, 0, -0.9 + i * 0.36).box(0.03, 1.16, 0.085, 0.03).pop();
        // doors
        G.col(col[0] * 0.9, col[1] * 0.9, col[2] * 0.9);
        for (let sz = -1; sz <= 1; sz += 2) G.push(3.0, 0, sz * 0.57).box(0.035, 1.17, 0.54, 0.02).pop();
        G.mat(0.35, 0.9, 0, 0).col(0.5, 0.5, 0.52);
        for (const pz of [-0.82, -0.3, 0.3, 0.82]) G.push(3.05, -1.15, pz).cyl(0.022, 2.3, 6, 0.004).pop();
        G.pop();
        taken.push([x, z, 3.6]);
        return addBox(x, y + 1.295, z, 3.03, 1.295, 1.22, yaw);
    }
    let ci = 0;
    const cset = [[21, -3, 0.3], [-14, -18, -0.5], [-24, 10, 1.3], [21, 15, 2.2], [8, 25, 0.1], [-6, -28, 1.57], [40, 4, 0.9], [-42, -4, 0.2], [14, 44, 2.6], [-15, 45, 0.5], [9, -41, 0.15], [-33, -36, 2.1], [35, -38, 1.1]];
    for (const [x, z, yaw] of cset) {
        const c = container(x, z, yaw, pal[ci++ % pal.length]);
        if (ci % 3 === 0) {
            const y2 = c.y + c.hy - 0.01;
            container(x + rr(-0.3, 0.3), z + rr(-0.3, 0.3), yaw + rr(-0.25, 0.25), pal[(ci + 3) % pal.length], y2);
        }
        if (ci % 4 === 1) {
            const ox = Math.sin(yaw) * 2.7,
                oz = Math.cos(yaw) * 2.7;
            container(x + ox, z + oz, yaw + rr(-0.06, 0.06), pal[(ci + 5) % pal.length]);
        }
    }

    // habitat modules
    function habitat(x: number, z: number, yaw: number) {
        const y = height(x, z);
        G.push(x, y, z, yaw);
        G.mat(0.6, 0.5, 0, 0).col(0.16, 0.17, 0.19);
        for (let s = -1; s <= 1; s += 2) G.push(0, 0.3, s * 1.4).box(4.4, 0.3, 0.14, 0.03).pop();
        for (const px of [-3.6, 0, 3.6]) G.push(px, 0.42, 0).box(0.12, 0.16, 1.6, 0.03).pop();
        G.mat(0.55, 0.15, 0, 0).col(0.62, 0.64, 0.66);
        G.push(0, 2.15, 0).box(4.6, 1.55, 2.0, 0.12).pop();
        G.col(0.55, 0.25, 0.08).push(0, 1.0, 0).box(4.63, 0.16, 2.03, 0.04).pop();
        G.col(0.3, 0.32, 0.35);
        for (const px of [-2.3, 0, 2.3]) G.push(px, 2.15, 0).box(0.05, 1.58, 2.03, 0.02).pop();
        // windows + door on +Z face
        for (const px of [-3.2, -1.2, 3.3]) {
            G.mat(0.3, 0.5, 0, 0).col(0.12, 0.13, 0.15).push(px, 2.5, 2.01).box(0.62, 0.42, 0.05, 0.03);
            G.mat(0.2, 0, 0.16, 4).col(1, 0.72, 0.4).push(0, 0, 0.03).box(0.52, 0.32, 0.03, 0.01).pop().pop();
        }
        G.mat(0.45, 0.4, 0, 0).col(0.2, 0.22, 0.25).push(1.1, 1.75, 2.02).box(0.55, 1.1, 0.05, 0.03).pop();
        G.mat(0.3, 0, 0.5, 4).col(1, 0.75, 0.45).push(1.1, 3.1, 2.1).box(0.25, 0.05, 0.08, 0.02).pop();
        G.mat(0.6, 0.4, 0, 0).col(0.2, 0.21, 0.23).push(1.1, 0.45, 2.7).box(0.8, 0.06, 0.7, 0.02).pop();
        // roof kit
        G.col(0.33, 0.35, 0.38).push(-2.6, 3.95, -0.6).box(0.8, 0.28, 0.6, 0.05).pop().push(-0.3, 3.9, 0.7).box(0.5, 0.22, 0.5, 0.05).pop();
        G.mat(0.4, 0.8, 0, 0).col(0.5, 0.5, 0.52).push(3.4, 3.7, -1.2).cyl(0.04, 3.2, 6, 0.005).pop();
        G.push(2.4, 3.95, 0.4, 0, 0.5, 0.3).lathe([[0, 0, 0, -1], [0.75, 0.3, -0.4, -1], [0.78, 0.33, 0.4, 1], [0, 0.06, 0, 1]], 14).pop();
        G.pop();
        const fx = Math.sin(yaw),
            fz = Math.cos(yaw),
            rx = Math.cos(yaw),
            rz = -Math.sin(yaw);
        W.lights.push({ x: x + rx * 1.1 + fx * 3.1, y: y + 2.9, z: z + rz * 1.1 + fz * 3.1, r: 9, g: 5.6, b: 2.8, rad: 13, shadow: SHADOW_NONE });
        W.glows.push({ x: x + rx * 1.1 + fx * 2.16, y: y + 3.1, z: z + rz * 1.1 + fz * 2.16, s: 0.8, r: 2.2, g: 1.4, b: 0.6 });
        addBox(x, y + 2, z, 4.65, 2, 2.05, yaw);
        taken.push([x, z, 6]);
    }
    habitat(-27, 27, 2.3);
    habitat(29, 30, -2.5);
    habitat(-13, -26, PI - 0.45);

    // fuel tanks
    function tank(x: number, z: number, yaw: number) {
        const y = height(x, z);
        G.push(x, y, z, yaw);
        G.mat(0.55, 0.3, 0, 0).col(0.2, 0.21, 0.23);
        for (const px of [-1.6, 1.6]) G.push(px, 0.45, 0).box(0.18, 0.5, 1.15, 0.04).pop();
        const m = m4aim(m4(), -2.7, 1.75, 0, 1, 0, 0);
        G.pushM(m).mat(0.45, 0.35, 0, 0).col(0.6, 0.6, 0.58);
        G.lathe([[0, 0, 0, -1], [0.8, 0.12, 0.5, -1], [1.3, 0.6, 1, -0.2], [1.3, 4.8, 1, 0.2], [0.8, 5.28, 0.5, 1], [0, 5.4, 0, 1]], 20);
        G.col(0.55, 0.14, 0.08).lathe([[1.3, 2.3, 0, -1], [1.34, 2.32, 1, 0], [1.34, 3.1, 1, 0], [1.3, 3.12, 0, 1]], 20);
        G.pop().pop();
        addBox(x, y + 1.5, z, 2.8, 1.55, 1.3, yaw);
        taken.push([x, z, 3.6]);
    }
    tank(-34, 17, 2.3);
    tank(-37.6, 20.6, 2.3);
    tank(37, 22, -0.9);

    // crates + barrels
    function crate(x: number, z: number, s: number, yaw: number, y0?: number) {
        const y = y0 === undefined ? height(x, z) - 0.03 : y0;
        G.push(x, y + s, z, yaw).mat(0.75, 0, 0, MATERIAL.TIMBER).col(0.34, 0.3, 0.22).box(s, s, s, 0.03);
        G.mat(0.5, 0.6, 0, 0).col(0.16, 0.17, 0.19);
        G.push(0, s * 0.6, 0).box(s * 1.03, 0.05, s * 1.03, 0.012).pop().push(0, -s * 0.6, 0).box(s * 1.03, 0.05, s * 1.03, 0.012).pop();
        G.pop();
        return addBox(x, y + s, z, s, s, s, yaw);
    }
    function barrel(x: number, z: number, col: number[]) {
        const y = height(x, z) - 0.03;
        G.push(x, y, z).mat(0.45, 0.5, 0, 0).col(col[0], col[1], col[2]).cyl(0.3, 0.92, 12, 0.03);
        G.col(col[0] * 0.7, col[1] * 0.7, col[2] * 0.7);
        for (const py of [0.28, 0.6]) G.push(0, py, 0).cyl(0.315, 0.04, 12, 0.012).pop();
        G.pop();
        addCyl(x, z, 0.32, y, y + 0.92);
    }
    const placeCrates = () => {
      for (let i = 0; i < 26; i++) {
        let x, z, n = 0;
        do {
            const a = rr(0, TAU),
                r = rr(15, 49);
            x = Math.cos(a) * r;
            z = Math.sin(a) * r;
        } while (!free(x, z, 2.2) && ++n < 40);
        if (n >= 40) continue;
        taken.push([x, z, 2.2]);
        const s = rr(0.42, 0.62),
            yaw = rr(0, TAU);
        const c = crate(x, z, s, yaw);
        if (R() < 0.5) crate(x + rr(-0.15, 0.15), z + rr(-0.15, 0.15), s * 0.8, yaw + rr(-0.6, 0.6), c.y + c.hy - 0.01);
        if (R() < 0.6) crate(x + Math.cos(yaw) * (s + 0.65), z - Math.sin(yaw) * (s + 0.65), rr(0.35, 0.5), yaw + rr(-0.3, 0.3));
        if (R() < 0.6) barrel(x - Math.sin(yaw) * (s + 0.6), z - Math.cos(yaw) * (s + 0.6), R() < 0.5 ? [0.5, 0.13, 0.08] : [0.12, 0.2, 0.3]);
      }
    };

    // floodlight masts
    for (let k = 0; k < 6; k++) {
        const a = PI / 2 + PI / 3 + (k * TAU) / 6 + (k % 2 ? 0.25 : -0.2),
            r = k % 2 ? 23 : 44,
            x = Math.cos(a) * r,
            z = Math.sin(a) * r,
            y = height(x, z),
            yaw = Math.atan2(x, z);
        G.push(x, y, z, yaw);
        G.mat(0.5, 0.7, 0, 0).col(0.2, 0.21, 0.23).push(0, 0.12, 0).box(0.32, 0.14, 0.32, 0.03).pop();
        G.cyl(0.085, 8.6, 8, 0.01, 0.06).push(0, 8.5, 0).box(0.75, 0.05, 0.05, 0.015).pop();
        for (const px of [-0.55, 0.55]) {
            G.mat(0.4, 0.6, 0, 0).col(0.16, 0.17, 0.19).push(px, 8.42, -0.18, 0, -0.9).box(0.24, 0.17, 0.12, 0.03);
            G.mat(0.2, 0, 0.9, 4).col(1, 0.82, 0.58).push(0, 0, -0.115).box(0.2, 0.13, 0.012, 0.004).pop().pop();
        }
        G.pop();
        const fx = -Math.sin(yaw),
            fz = -Math.cos(yaw);
        W.lights.push({ x: x + fx * 2.2, y: y + 7.4, z: z + fz * 2.2, r: 21, g: 15.5, b: 9, rad: 27, shadow: SHADOW_NONE });
        W.glows.push({ x: x + fx * 0.35, y: y + 8.3, z: z + fz * 0.35, s: 2.6, r: 5, g: 3.6, b: 2 });
        addCyl(x, z, 0.16, y, y + 8.6);
        taken.push([x, z, 2]);
    }

    // pylons (static part) + overhead pipe racks to the hub
    PYL.forEach((p, k) => {
        const [x, z] = p,
            y = height(x, z);
        G.push(x, y - 0.25, z);
        G.mat(0.8, 0.05, 0, MATERIAL.CONCRETE).col(0.2, 0.21, 0.23).lathe([[0, 0.5, 0, 1], [3.9, 0.5, 0, 1], [4.3, 0, 1, 0.5]], 6);
        G.mat(0.5, 0.6, 0, 0).col(0.17, 0.18, 0.2).push(0, 0.5, 0).cyl(1.25, 1.1, 8, 0.08, 1.0).pop();
        G.mat(0.4, 0.8, 0, 0).col(0.26, 0.27, 0.29).push(0, 1.6, 0).cyl(0.55, 6.2, 14, 0.05, 0.42).pop();
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * TAU + 0.4;
            G.push(Math.cos(a) * 0.95, 0.5, Math.sin(a) * 0.95, -a, 0, 0.2).box(0.07, 1.3, 0.16, 0.02).pop();
        }
        G.pop();
        addCyl(x, z, 4.0, y - 2, y + 0.25);
        const col = addCyl(x, z, 2.2, y - 1, y + 8);
        W.pylons.push({ x, z, y, lit: false, hp: W.PYHP, thaw: 0, glow: 0, hitT: 0, col, k, shadow: SHADOW_NONE });
        // pipe rack
        const l = Math.hypot(x, z),
            ux = x / l,
            uz = z / l,
            h = 3.5;
        G.mat(0.4, 0.75, 0, 0).col(0.3, 0.31, 0.33);
        for (const o of [-0.22, 0.22]) {
            const sx = ux * 10.5 - uz * o,
                sz = uz * 10.5 + ux * o;
            G.pushM(m4aim(m4(), sx, h, sz, ux, 0, uz)).cyl(0.13, l - 12, 10, 0.01).pop();
        }
        for (let d = 12; d < l - 2; d += 5.6) {
            const px = ux * d,
                pz = uz * d,
                gy = height(px, pz);
            G.mat(0.55, 0.6, 0, 0).col(0.18, 0.19, 0.21);
            for (const o of [-0.5, 0.5]) {
                const qx = px - uz * o,
                    qz = pz + ux * o;
                G.push(qx, gy - 0.1, qz, Math.atan2(ux, uz)).push(0, (h - gy) / 2, 0).box(0.06, (h - gy) / 2 + 0.05, 0.06, 0.012).pop().pop();
                addCyl(qx, qz, 0.1, gy - 0.2, h);
            }
            G.push(px, h - 0.2, pz, Math.atan2(ux, uz)).box(0.62, 0.05, 0.07, 0.012).pop();
            taken.push([px, pz, 1.2]);
        }
    });

    // radio mast
    {
        const x = -45,
            z = 29,
            y = height(x, z),
            H = 21;
        G.mat(0.5, 0.75, 0, 0).col(0.3, 0.12, 0.08);
        for (let i = 0; i < 4; i++) {
            const sx = i & 1 ? 1 : -1,
                sz = i & 2 ? 1 : -1;
            G.pushM(m4aim(m4(), x + sx * 1.5, y - 0.2, z + sz * 1.5, -sx * 1.3, H, -sz * 1.3)).cyl(0.07, Math.hypot(H, 1.3 * 1.41), 6, 0.01).pop();
        }
        for (let t = 0.12; t < 1; t += 0.15) {
            const w = 1.5 - 1.3 * t;
            G.col(t * 7 % 2 > 1 ? 0.5 : 0.3, t * 7 % 2 > 1 ? 0.5 : 0.12, t * 7 % 2 > 1 ? 0.5 : 0.08);
            for (let s = -1; s <= 1; s += 2) {
                G.push(x, y + H * t, z + s * w).box(w, 0.035, 0.035, 0.01).pop();
                G.push(x + s * w, y + H * t, z).box(0.035, 0.035, w, 0.01).pop();
            }
        }
        G.mat(0.3, 1, 1, 4).col(1, 0.12, 0.08).push(x, y + H + 0.1, z).sphere(0.16, 8, 6).pop();
        W.glows.push({ x, y: y + H + 0.1, z, s: 2.2, r: 6, g: 0.5, b: 0.3, blink: 1 });
        addBox(x, y + 3, z, 1.5, 3, 1.5, 0);
        taken.push([x, z, 4]);
    }

    placeCrates();

    // ice spires (static scenery/cover, ice material)
    function spire(x: number, z: number, s: number) {
        const y = height(x, z) - 0.4;
        G.push(x, y, z, rr(0, TAU));
        G.mat(0.15, 0, 0.05, 3).col(0.5, 0.78, 1);
        G.push(0, 0, 0, 0, rr(-0.12, 0.12), rr(-0.12, 0.12)).crystal(rr(0.9, 1.3) * s, rr(5, 8.5) * s, 2 * s, 6, 0.75, 0, R).pop();
        const n = 3 + ((R() * 3) | 0);
        for (let i = 0; i < n; i++) {
            const a = rr(0, TAU),
                d = rr(0.7, 1.5) * s;
            G.push(Math.cos(a) * d, 0, Math.sin(a) * d, a, rr(-0.5, 0.5), rr(-0.5, 0.5)).crystal(rr(0.35, 0.7) * s, rr(1.6, 4) * s, 1 * s, 5, 0.7, 0, R).pop();
        }
        G.pop();
        addCyl(x, z, 1.35 * s, y, y + 4.5 * s);
        taken.push([x, z, 3 * s + 1]);
    }
    for (let i = 0; i < 15; i++) {
        const a = (i / 15) * TAU + rr(-0.12, 0.12),
            r = rr(53, 60);
        if (Math.abs(a - PI * 1.5) < 0.2) continue;
        spire(Math.cos(a) * r, Math.sin(a) * r, rr(0.9, 1.5));
        W.spawns.push([Math.cos(a + 0.2) * 49, Math.sin(a + 0.2) * 49]);
    }
    for (let i = 0; i < 7; i++) {
        let x, z, n = 0;
        do {
            const a = rr(0, TAU),
                r = rr(17, 47);
            x = Math.cos(a) * r;
            z = Math.sin(a) * r;
        } while (!free(x, z, 3.5) && ++n < 40);
        if (n < 40) spire(x, z, rr(0.45, 0.75));
    }
    W.mesh = { props: G.build(), terrain };

    // the frozen heart at the hub centre (collider only; mesh is dynamic)
    W.heart = { col: addCyl(0, 0, 3.6, -1, 8), awake: false, diss: 0 };
}
