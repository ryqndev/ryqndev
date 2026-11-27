import { Geo, MATERIAL, type Mesh } from '@ryqndev/brinewake-renderer';
import { rng, TAU } from '@ryqndev/kiln-math';

import { HB, PLAN, toLocal, toWorld, trodden } from './harbour';
import { KEEP } from './keep';
import { fort } from './landmarks';
import { Mason } from './mason';
import { bakeHeightmap, CELL, height, hmap, HN, ISLANDS, openWater, sampleAt, SEA } from './terrain';
import { buildTown,builtOver } from './town';
import { W } from './world';

// Procedurally builds the whole level: island terrain, the home port and its town, palms and rocks, lanterns and sea lanes.
export function buildWorld() {
    bakeHeightmap();
    const R = rng(2718);
    const rr = (a: number, b: number) => a + R() * (b - a);
    const terrain = buildTerrain();

    const G = new Geo();
    // ---- the home port ----
    W.town = buildTown(G, R);
    const M = new Mason(G, R, height);

    // ---- palms and rocks on every island, wherever the town has not been built ----
    const home = ISLANDS[0];
    const wild = (x: number, z: number) => {
        const [lx, lz] = toLocal(x, z);
        return !builtOver(lx, lz);
    };
    for (const o of ISLANDS) {
        const palms = Math.round(o.r * o.r * 0.0015 * rr(0.7, 1.3));
        for (let n = 0, tries = 0; n < palms && tries < palms * 12; tries++) {
            const a = rr(0, TAU),
                d = Math.sqrt(R()) * o.r * 1.15,
                x = o.x + Math.cos(a) * d,
                z = o.z + Math.sin(a) * d,
                h = height(x, z);
            if (h < 1.3 || h > 11 || (o === home && !wild(x, z))) continue;
            M.palm(x, h - 0.3, z, rr(0.8, 1.25));
            n++;
        }
        for (let n = 0; n < 5 + o.r / 14; n++) {
            const a = rr(0, TAU);
            let d = o.r * 0.4;
            while (d < o.r * 2 && height(o.x + Math.cos(a) * d, o.z + Math.sin(a) * d) > rr(-1.2, 1.2)) d += 2;
            const x = o.x + Math.cos(a) * d,
                z = o.z + Math.sin(a) * d,
                s = rr(0.7, 2.6);
            if (o === home && !wild(x, z)) continue;
            M.paint([rr(0.3, 0.4), rr(0.3, 0.38), 0.33], 0.88);
            G.push(x, height(x, z) - 0.35 * s, z, rr(0, TAU), rr(-0.3, 0.3), rr(-0.3, 0.3), s * rr(0.8, 1.5), s * rr(0.5, 1), s * rr(0.8, 1.4)).sphere(1, 7, 5).pop();
        }
    }
    // ---- the king's fort on its outer island, flying navy colours ----
    {
        const K = KEEP,
            lit = M.lights.length;
        G.push(K.x, 0, K.z, K.yaw);
        fort({ M, G, T: { ...W.town, smokes: [] }, at: () => [0, 0, 0], solid: () => {}, walk: () => {}, idler: () => {} }, { x: 0, z: 0, y: K.y }, [[0.12, 0.24, 0.6], [0.92, 0.9, 0.84]], true);
        G.pop();
        M.floor = null;
        W.lights.push(...M.lights.slice(lit));
        // its treasure lands on the nearest open water in front of it
        let spill = [K.x + K.dx * 60, K.z + K.dz * 60];
        for (let d = K.r + 14; d < 160; d += 6)
            if (openWater(K.x + K.dx * d, K.z + K.dz * d, 10, 3)) {
                spill = [K.x + K.dx * (d + 8), K.z + K.dz * (d + 8)];
                break;
            }
        W.strongholds = [{ name: K.name, x: K.x, z: K.z, yaw: K.yaw, r: 18, top: 12.2, spill }];
    }
    W.mesh = { terrain, props: G.build() };

    // ---- the roads off the harbour mouth, where a ship anchors; and the sea lanes around the archipelago ----
    const [px, pz] = toWorld(0, -92),
        [tx, tz] = toWorld(0, 30);
    // docked, she lies along the seaward face of the wharf's head, her head to the west and the open sea on her beam
    const [bx, bz] = toWorld(0, PLAN.head.z - PLAN.head.hd);
    W.port = { x: px, z: pz, r: 78, yaw: HB.yaw, tx, tz, berth: { x: bx, z: bz, yaw: Math.atan2(HB.sx, HB.sz), nx: HB.dx, nz: HB.dz } };
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
            // red carries how much of the ground here is the town's trodden earth
            T.c[0] = 1 - trodden(sampleAt(i), sampleAt(j));
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
