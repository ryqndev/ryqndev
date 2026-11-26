import { Geo, MATERIAL, type Mesh, type Point } from '@ryqndev/brinewake-renderer';
import { clamp, rng, TAU } from '@ryqndev/rimefire-math';

import { bakeHeightmap, CELL, height, hmap, HN, ISLANDS, openWater, sampleAt, SEA } from './terrain';
import { W } from './world';

// Procedurally builds the whole level: island terrain, palms and rocks, the home port, lanterns and sea lanes.
export function buildWorld() {
    bakeHeightmap();
    const R = rng(2718);
    const rr = (a: number, b: number) => a + R() * (b - a);
    const terrain = buildTerrain();

    const G = new Geo();
    // things standing on the ground darken toward their base
    G.aoFn = (x, y, z) => 0.55 + 0.45 * clamp((y - Math.max(height(x, z), 0)) / 2.5, 0, 1);

    // ---- the port, on the side of the home island with the most open sea in front of it ----
    const home = ISLANDS[0];
    let ang = 0,
        clear = -1;
    for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU,
            px = home.x + Math.cos(a) * 280,
            pz = home.z + Math.sin(a) * 280;
        let c = 1e9;
        for (const o of ISLANDS) if (o !== home) c = Math.min(c, Math.hypot(px - o.x, pz - o.z) - o.r);
        if (c > clear) {
            clear = c;
            ang = a;
        }
    }
    const dx = Math.cos(ang),
        dz = Math.sin(ang);
    // walk out from the middle of the island: the pier runs from the top of the beach to deep water
    let root = 0,
        head = 0;
    for (let d = 10; d < 400; d++) {
        const h = height(home.x + dx * d, home.z + dz * d);
        if (!root && h < 1.5) root = d;
        if (root && h < -5.5) {
            head = d + 9;
            break;
        }
    }
    const len = head - root,
        rx = home.x + dx * root,
        rz = home.z + dz * root,
        // local -Z runs out along the pier, local +X to its right
        yaw = Math.atan2(-dx, -dz),
        sx = Math.cos(yaw),
        sz = -Math.sin(yaw);
    const at = (lx: number, lz: number): Point => [rx + sx * lx - dx * lz, rz + sz * lx - dz * lz];
    const lantern = (lx: number, lz: number, y: number) => {
        G.mat(0.6, 0.4, 0, MATERIAL.METAL).col(0.12, 0.12, 0.13).strut([lx, y - 2.6, lz], [lx, y - 0.25, lz], 0.07);
        G.mat(0.3, 0, 0.5, MATERIAL.EMISSIVE).col(1, 0.72, 0.36).push(lx, y, lz).box(0.2, 0.26, 0.2, 0.04).pop();
        const [x, z] = at(lx, lz);
        W.lights.push({ x, y, z, r: 9, g: 5.4, b: 2.2, rad: 30, glow: 1.3 });
    };

    G.push(rx, 0, rz, yaw);
    G.mat(0.85, 0, 0, MATERIAL.WOOD).col(0.5, 0.38, 0.25);
    G.push(0, 1.55, -len / 2).box(2.5, 0.16, len / 2 + 1.5, 0.04).pop();
    G.push(0, 1.55, -len).box(8, 0.16, 2.8, 0.04).pop();
    G.col(0.3, 0.22, 0.15);
    for (let z = 2; z < len + 2; z += 5) for (const s of [-1, 1]) G.push(s * 2.3, -8, -z).cyl(0.24, 9.9, 6, 0.03).pop();
    for (const s of [-1, 1]) for (const z of [-2.4, 2.4]) G.push(s * 7.5, -8, -len + z).cyl(0.24, 9.9, 6, 0.03).pop();
    // cargo waiting on the pier head
    for (let i = 0; i < 9; i++) {
        const cx = rr(-7, 7),
            cz = -len + rr(-1.8, 1.8);
        if (Math.abs(cx) < 2.6) continue;
        if (i % 3) G.mat(0.9, 0, 0, MATERIAL.WOOD).col(0.52, 0.4, 0.24).push(cx, 2.2, cz, rr(0, 1.5)).box(0.5, 0.5, 0.5, 0.04).pop();
        else G.mat(0.85, 0, 0, MATERIAL.WOOD).col(0.42, 0.28, 0.17).push(cx, 1.7, cz).cyl(0.42, 1.05, 8, 0.08).pop();
    }
    lantern(-2.2, -len * 0.4, 4.6);
    lantern(7.4, -len - 2.2, 4.6);
    lantern(-7.4, -len - 2.2, 4.6);
    G.pop();

    // the harbour town behind the pier
    const footprints: Point[] = [];
    const house = (x: number, z: number, hw: number, hd: number, hh: number) => {
        const rh = hw * rr(0.55, 0.8),
            ex = hw + 0.35,
            ez = hd + 0.35;
        G.push(x, height(x, z) - 0.5, z, yaw + rr(-0.25, 0.25));
        G.mat(0.92, 0, 0, MATERIAL.PAINT).col(rr(0.74, 0.86), rr(0.7, 0.8), rr(0.58, 0.68));
        G.push(0, hh / 2 - 0.6, 0).box(hw, hh / 2 + 0.6, hd, 0.05).pop();
        for (const s of [-1, 1]) G.flat([[-hw, hh, s * hd], [hw, hh, s * hd], [0, hh + rh, s * hd]], 0, hh, 0);
        G.mat(0.85, 0, 0, MATERIAL.PAINT).col(0.6, 0.27, 0.17);
        for (const s of [-1, 1]) G.flat([[s * ex, hh - 0.2, -ez], [s * ex, hh - 0.2, ez], [0, hh + rh + 0.1, ez], [0, hh + rh + 0.1, -ez]], 0, hh - 3, 0);
        G.mat(0.8, 0, 0, MATERIAL.WOOD).col(0.3, 0.2, 0.13).push(0, 1.5, -hd - 0.03).box(0.55, 1.05, 0.06, 0.02).pop();
        G.mat(0.3, 0, 0.45, MATERIAL.EMISSIVE).col(1, 0.74, 0.4);
        for (const s of [-1, 1]) G.push(s * hw * 0.58, hh * 0.62 + 0.3, -hd - 0.03).box(0.36, 0.42, 0.05, 0.02).pop();
        G.pop();
    };
    for (let tries = 0; footprints.length < 7 && tries < 200; tries++) {
        const [x, z] = at(rr(-42, 42), rr(8, 46)),
            h = height(x, z);
        if (h < 2 || h > 10 || footprints.some((f) => Math.hypot(x - f[0], z - f[1]) < 13)) continue;
        if (Math.abs(height(x + 4, z) - h) + Math.abs(height(x, z + 4) - h) > 2.2) continue;
        footprints.push([x, z]);
        house(x, z, rr(2.6, 4.2), rr(3, 4.6), rr(3, 4.4));
    }

    // the lighthouse, on the shore a little way round from the pier
    {
        const a = ang + 0.85;
        let d = 20;
        while (d < 300 && height(home.x + Math.cos(a) * d, home.z + Math.sin(a) * d) > 3) d++;
        const x = home.x + Math.cos(a) * d,
            z = home.z + Math.sin(a) * d,
            y = height(x, z) - 0.6;
        footprints.push([x, z]);
        G.push(x, y, z);
        G.mat(0.8, 0, 0, MATERIAL.PAINT).col(0.88, 0.86, 0.8).lathe([[0, 0, 0, -1], [2.9, 0, 1, 0.1], [2.45, 5.6, 1, 0.1]], 14);
        G.col(0.66, 0.16, 0.12).lathe([[2.45, 5.6, 1, 0.1], [2.1, 10, 1, 0.1]], 14);
        G.col(0.88, 0.86, 0.8).lathe([[2.1, 10, 1, 0.1], [1.75, 14.4, 1, 0.1], [2.5, 14.4, 0, -1], [2.5, 14.8, 1, 0], [0, 14.8, 0, 1]], 14);
        G.mat(0.3, 0, 0.9, MATERIAL.EMISSIVE).col(1, 0.86, 0.55).push(0, 14.8, 0).cyl(1.25, 1.9, 10, 0.02).pop();
        G.mat(0.7, 0.2, 0, MATERIAL.PAINT).col(0.5, 0.13, 0.1).push(0, 16.7, 0).cyl(1.65, 1.5, 10, 0.02, 0.05).pop();
        G.pop();
        W.lights.push({ x, y: y + 15.8, z, r: 30, g: 23, b: 11, rad: 150, glow: 5 });
    }

    // ---- palms and rocks on every island ----
    const blade = (a: Point, b: Point, c: Point, wa: number, wb: number, wc: number) => {
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = (ny < 0 ? -1 : 1) / (Math.hypot(nx, ny, nz) || 1);
        nx *= l;
        ny *= l;
        nz *= l;
        // both faces: fronds are seen from above and from the deck below
        for (const s of [1, -1]) G.tri(G.vert(a[0], a[1], a[2], nx * s, ny * s, nz * s, wa), G.vert(b[0], b[1], b[2], nx * s, ny * s, nz * s, wb), G.vert(c[0], c[1], c[2], nx * s, ny * s, nz * s, wc));
    };
    const palm = (x: number, z: number, s: number) => {
        const lean = rr(0, TAU),
            bend = rr(0.5, 2.4) * s,
            h = rr(5.5, 8.5) * s,
            y = height(x, z) - 0.3;
        const spine: Point[] = [];
        for (let k = 0; k <= 3; k++) spine.push([x + Math.cos(lean) * bend * (k / 3) ** 2, y + (h * k) / 3, z + Math.sin(lean) * bend * (k / 3) ** 2]);
        G.mat(0.9, 0, 0, MATERIAL.WOOD).col(0.42, 0.34, 0.24);
        for (let k = 0; k < 3; k++) G.strut(spine[k], spine[k + 1], 0.27 * s * (1 - k * 0.2), 0.27 * s * (1 - (k + 1) * 0.2), 5);
        const [tx, ty, tz] = spine[3];
        G.mat(0.7, 0, 0, MATERIAL.LEAF).col(rr(0.18, 0.26), rr(0.36, 0.46), 0.12);
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * TAU + rr(0, 0.6),
                c = Math.cos(a),
                sn = Math.sin(a),
                reach = rr(2.6, 3.7) * s,
                w = 0.6 * s;
            const mid: Point = [tx + c * reach * 0.5, ty + 0.6 * s, tz + sn * reach * 0.5],
                tip: Point = [tx + c * reach, ty - rr(0.4, 1.5) * s, tz + sn * reach],
                l: Point = [mid[0] - sn * w, mid[1] - 0.15 * s, mid[2] + c * w],
                r: Point = [mid[0] + sn * w, mid[1] - 0.15 * s, mid[2] - c * w];
            blade([tx, ty, tz], l, mid, 0.1, 0.5, 0.45);
            blade([tx, ty, tz], mid, r, 0.1, 0.45, 0.5);
            blade(l, tip, mid, 0.5, 1, 0.45);
            blade(mid, tip, r, 0.45, 1, 0.5);
        }
    };
    const rock = (x: number, z: number, s: number) => {
        G.mat(0.88, 0, 0, MATERIAL.PAINT).col(rr(0.3, 0.4), rr(0.3, 0.38), 0.33);
        G.push(x, height(x, z) - 0.35 * s, z, rr(0, TAU), rr(-0.3, 0.3), rr(-0.3, 0.3), s * rr(0.8, 1.5), s * rr(0.5, 1), s * rr(0.8, 1.4)).sphere(1, 7, 5).pop();
    };
    for (const o of ISLANDS) {
        const palms = Math.round(o.r * o.r * 0.0015 * rr(0.7, 1.3));
        for (let n = 0, tries = 0; n < palms && tries < palms * 12; tries++) {
            const a = rr(0, TAU),
                d = Math.sqrt(R()) * o.r * 1.15,
                x = o.x + Math.cos(a) * d,
                z = o.z + Math.sin(a) * d,
                h = height(x, z);
            if (h < 1.3 || h > 11 || footprints.some((f) => Math.hypot(x - f[0], z - f[1]) < 8)) continue;
            if (o === home && Math.hypot(x - rx, z - rz) < 9) continue;
            palm(x, z, rr(0.8, 1.25));
            n++;
        }
        for (let n = 0; n < 5 + o.r / 14; n++) {
            const a = rr(0, TAU);
            let d = o.r * 0.4;
            while (d < o.r * 2 && height(o.x + Math.cos(a) * d, o.z + Math.sin(a) * d) > rr(-1.2, 1.2)) d += 2;
            const x = o.x + Math.cos(a) * d,
                z = o.z + Math.sin(a) * d;
            if (o === home && Math.hypot(x - rx, z - rz) < 30) continue;
            rock(x, z, rr(0.7, 2.6));
        }
    }
    W.mesh = { terrain, props: G.build() };

    // ---- the anchorage off the pier head, and the sea lanes around the archipelago ----
    W.port = { x: home.x + dx * (head + 36), z: home.z + dz * (head + 36), r: 62, yaw, tx: rx, tz: rz };
    for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU + rr(-0.12, 0.12);
        for (const f of [0.76, 0.64, 0.86, 0.52, 0.92, 0.42]) {
            const x = Math.cos(a) * SEA * f,
                z = Math.sin(a) * SEA * f;
            if (openWater(x, z, 60, 8)) {
                W.routes.push([x, z]);
                break;
            }
        }
    }
}

function buildTerrain(): Mesh {
    const T = new Geo();
    T.mat(0.9, 0, 0, MATERIAL.TERRAIN).col(1, 1, 1);
    // one vertex per height sample, created the first time a visible cell needs it
    const id = new Int32Array(HN * HN).fill(-1);
    const vert = (i: number, j: number) => {
        const o = j * HN + i;
        if (id[o] < 0) {
            const l = hmap[i > 0 ? o - 1 : o],
                r = hmap[i < HN - 1 ? o + 1 : o],
                d = hmap[j > 0 ? o - HN : o],
                u = hmap[j < HN - 1 ? o + HN : o];
            id[o] = T.vert(sampleAt(i), hmap[o], sampleAt(j), l - r, 2 * CELL, d - u);
        }
        return id[o];
    };
    for (let j = 0; j < HN - 1; j++)
        for (let i = 0; i < HN - 1; i++) {
            const o = j * HN + i;
            // the sea hides the bed once it is a few metres down
            if (Math.max(hmap[o], hmap[o + 1], hmap[o + HN], hmap[o + HN + 1]) < -5.5) continue;
            const a = vert(i, j),
                b = vert(i + 1, j),
                c = vert(i, j + 1),
                d = vert(i + 1, j + 1);
            T.i.push(a, c, b, b, c, d);
        }
    return T.build();
}
