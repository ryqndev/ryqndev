import type { Geo, Point } from '@ryqndev/brinewake-renderer';
import { PI, TAU } from '@ryqndev/kiln-math';

import { HB, PLAN as P, toWorld } from './harbour';
import { church, customsHouse, fort, lighthouse, mansion, tavern, warehouse, windmill } from './landmarks';
import { boatHull, C, Mason, PLASTERS, type Rgb, SHUTTERS, TILES } from './mason';
import { height } from './terrain';
import type { Town } from './types';
import { W } from './world';

const Q = P.quayY,
    MID = P.midY,
    TOP = P.topY;
const AWNINGS: Rgb[] = [
    [0.7, 0.2, 0.16],
    [0.2, 0.36, 0.5],
    [0.82, 0.62, 0.2],
    [0.25, 0.45, 0.3],
];

/** What every part of the town is built with: the kit, and the notes left for the life of the place. */
export interface Site {
    M: Mason;
    G: Geo;
    T: Town;
    /** harbour-local [x, y, z] to world */
    at(lx: number, y: number, lz: number): number[];
    /** something a hull cannot pass through, at a harbour-local point */
    solid(lx: number, lz: number, r: number): void;
    /** a closed circuit `n` people walk, in harbour-local [x, y, z] points */
    walk(n: number, pts: number[][], guard?: boolean): void;
    /** someone standing about, facing `yaw` in the harbour's frame */
    idler(lx: number, y: number, lz: number, yaw: number): void;
}

/**
 * Builds the home port into `G`: the waterfront and its piers, the town climbing its terraces, the
 * fort, the breakwater and the lighthouse. Returns what its townsfolk, boats and smoke need to know.
 */
export function buildTown(G: Geo, R: () => number): Town {
    const M = new Mason(G, R, height),
        [cx, cz] = toWorld(-5, 30);
    const T: Town = { x: cx, z: cz, reach: 230, walks: [], idlers: [], moorings: [], smokes: [], flames: [], mill: null, gulls: [], beam: [] };
    const at = (lx: number, y: number, lz: number) => {
        const [x, z] = toWorld(lx, lz);
        return [x, y, z];
    };
    const S: Site = {
        M,
        G,
        T,
        at,
        solid: (lx, lz, r) => W.solids.push([...toWorld(lx, lz), r]),
        walk: (n, pts, guard) => T.walks.push({ pts: pts.map((p) => at(p[0], p[1], p[2])), n, guard }),
        idler: (lx, y, lz, yaw) => T.idlers.push([...at(lx, y, lz), yaw + HB.yaw]),
    };
    T.gulls = at(4, 24, -34);

    G.push(HB.x, 0, HB.z, HB.yaw);
    waterfront(S);
    shipyard(S);
    beach(S);
    plaza(S);
    terraces(S);
    lowerTown(S);
    middleTown(S);
    upperTown(S);
    fort(S);
    lighthouse(S);
    windmill(S);
    greenery(S);
    G.pop();
    M.floor = null;
    W.lights.push(...M.lights);
    W.blocks.push(...M.blocks);
    W.posts.push(...M.posts);

    const boat = (lx: number, lz: number, yaw: number, kind: number) => {
        const [x, z] = toWorld(lx, lz);
        T.moorings.push({ x, z, yaw: yaw + HB.yaw, kind });
    };
    // rowing boats at the jetty and the landing steps, smacks lying off, and a brig and a sloop at anchor
    // off the beach. The head of the wharf is kept clear: it is where the player's own ship lies.
    boat(-47.2, -9, 0.1, 0);
    boat(-40.8, -15, PI - 0.15, 0);
    boat(-47.4, -23, -0.1, 0);
    boat(-17, -4.2, PI / 2, 0);
    boat(34.5, -4.4, -PI / 2 + 0.1, 0);
    boat(73.5, -20, 0.05, 0);
    boat(-30, -19, 0.5, 1);
    boat(24, -27, -0.4, 1);
    boat(42, -14, PI / 2 + 0.2, 1);
    boat(74, -44, 0.15, 1);
    // (both well inshore of the wharf's head, so she has a clear run along it when she leaves)
    boat(-80, -34, 0.3, 2);
    for (const dz of [-9, 0, 9]) S.solid(-80 - Math.sin(0.3) * dz, -34 + Math.cos(0.3) * dz, 4.2);
    boat(-98, -44, 0.5, 3);
    for (const dz of [-6, 0, 6]) S.solid(-98 - Math.sin(0.5) * dz, -44 + Math.cos(0.5) * dz, 3.4);
    return T;
}

/** True where a world point lies on ground the town or its works have taken: nothing wild grows there. */
export function builtOver(lx: number, lz: number): boolean {
    if (lx > P.left - 8 && lx < P.right + 16 && lz > -72 && lz < P.back + 2) return true;
    return Math.hypot(lx - P.fort.x, lz - P.fort.z) < P.fort.r + 12;
}

// ---- the waterfront: quay wall, the wharf, the fishing jetty ----
function waterfront(S: Site) {
    const { M } = S,
        x0 = P.quayLeft,
        x1 = P.right + 10;
    M.floor = null;
    M.stone().slab(x0, x1, -3.5, Q, -0.6, 13, 0.05);
    M.stone(C.PALE).slab(x0 - 0.12, x1, Q, Q + 0.16, -0.85, 0.5, 0.04);
    // fender piles down the face of the wall, bollards along its edge
    for (let x = x0 + 3; x < P.mole.x - 5; x += 7) {
        if (Math.abs(x) < 5 || Math.abs(x + 44) < 3 || (x > 50 && x < 66)) continue;
        M.wood(C.DARK).post(x, -3, -0.95, 0.2, Q + 2.75, 6);
        M.bollard(x + 3.5, Q + 0.16, 0.85);
    }
    // landing steps down to the boats
    for (const sx of [-24, 27]) {
        M.stone();
        for (let i = 0; i < 10; i++) M.slab(sx + i * 0.5, sx + (i + 1) * 0.5, -3, Q - (i + 1) * 0.22, -2.5, -0.6);
        M.slab(sx + 5, sx + 7.6, -3, 0.2, -2.5, -0.6);
        M.wood(C.DARK).post(sx + 7.3, -3, -2.3, 0.14, 4.4, 5);
    }
    M.floor = Q;
    for (const x of [-57, -33, -13, 13, 37, 69]) M.lampPost(x, Q, 1.9, 3.7);

    // the wharf: a long pier to a broad head in deep water
    pier(S, 0, 46, 3);
    const { z: hz, hw, hd } = P.head;
    M.floor = null;
    M.wood(C.PLANK, 0.9).slab(-hw, hw, Q - 0.2, Q, hz - hd, hz + hd);
    M.wood(C.DARK);
    for (const z of [hz - hd, hz + hd]) M.slab(-hw - 0.1, hw + 0.1, Q - 0.42, Q + 0.07, z - 0.12, z + 0.12);
    for (const x of [-hw, hw]) M.slab(x - 0.12, x + 0.12, Q - 0.42, Q + 0.07, hz - hd, hz + hd);
    for (let x = -hw + 0.2; x <= hw - 0.19; x += 3.6)
        for (const z of [hz - hd + 0.2, hz, hz + hd - 0.2]) {
            if (z === hz && Math.abs(x) < 10) continue;
            M.post(x, -9, z, 0.26, Q + 9 + (z === hz + hd - 0.2 && Math.abs(x) < 4 ? -0.2 : 0.8), 6);
        }
    for (let x = -8; x <= 8; x += 4) S.solid(x, hz, 6.3);
    M.floor = Q;
    shed(S, 7.2, Q, hz + 1.2, 0, 2.4, 2, 2.5, [0.36, 0.42, 0.44]);
    crane(S, -7.4, Q, hz - 1.4, 0.5);
    M.cargo(-5.5, Q, hz + 2.6, 7, 2.2).cargo(5.2, Q, hz - 4.3, 4, 0.9).cargo(1.9, Q, -22, 3, 0.6);
    M.lampPost(10.3, Q, hz - 4.9, 3.4, -0.5).lampPost(-10.3, Q, hz - 4.9, 3.4).lampPost(-2.6, Q, -24, 3.4);
    // a signal mast dressed with flags
    M.wood(C.TIMBER).post(9.6, Q, hz + 4.6, 0.13, 10, 6, 0.07).beam([7.8, Q + 7.6, hz + 4.6], [11.4, Q + 7.6, hz + 4.6], 0.05);
    M.flag(9.7, Q + 9.5, hz + 4.6, 2.2, 1.1, [0.72, 0.14, 0.1], [0.9, 0.84, 0.7]);
    for (let i = 0; i < 4; i++) M.flag(8 + i * 0.9, Q + 7.2, hz + 4.6, 0.01, 0.6, AWNINGS[i % 4]).cloth(AWNINGS[i % 4]).sheet([[8 + i * 0.9, Q + 7.55, hz + 4.6], [8.7 + i * 0.9, Q + 7.55, hz + 4.6], [8.35 + i * 0.9, Q + 6.8, hz + 4.6]], [0.05, 0.05, 0.4]);
    S.walk(3, [[1.4, Q, 9], [1.6, Q, -45], [8.5, Q, hz - 3], [-3, Q, hz - 3.6], [-8.5, Q, hz + 3.4], [-1.6, Q, -45], [-1.4, Q, 9]]);
    S.idler(4.2, Q, hz + 1.5, 2.4);
    S.idler(-4, Q, hz + 4.3, 0.3);

    // the fishing jetty
    pier(S, -44, 29, 1.5);
    M.floor = Q;
    for (let i = 0; i < 6; i++) {
        const z = -6 - i * 4;
        if (i % 2) M.crate(-44 + M.rr(-0.7, 0.7), Q, z, 0.3, M.rr(0, 1));
        else M.paint(C.BURLAP).post(-44 + M.rr(-0.7, 0.7), Q, z, 0.32, 0.36, 7, 0.38);
    }
    M.lampPost(-43, Q, -27.5, 3);
    S.walk(1, [[-43.6, Q, 8], [-43.6, Q, -27], [-44.4, Q, -27], [-44.4, Q, 8]]);
    S.idler(-44.9, Q, -20, PI / 2);
    S.idler(-43.2, Q, -12, -PI / 2);

    // quayside trade: cargo outside the warehouses, carts, people
    M.cargo(-52, Q, 9.5, 9, 3).cargo(-38, Q, 4, 4, 1.4).cargo(46, Q, 9, 8, 2.6).cargo(-8, Q, 5, 5, 1.6).cargo(16, Q, 4, 3, 1.2);
    M.cart(-46, Q, 5.5, 0.4).cart(41, Q, 5, 2.2).cart(9, Q, 9.5, -1.2);
    crane(S, -37.5, Q, 2.6, 0.25);
    crane(S, 44.5, Q, 2.6, -0.2);
    S.walk(7, [[-59, Q, 5.5], [-6, Q, 6.2], [48, Q, 5.6], [74, Q, 5], [74, Q, 10.5], [20, Q, 11], [-30, Q, 10.6], [-59, Q, 10.8]]);
    for (const [x, z, a] of [[-50, 7.5, 1], [-49, 8.2, -2], [44, 7, 0.4], [14.5, 5.4, 2.6], [-36.5, 5, -1], [60, 9, 1.8], [61, 9.6, -1.6]]) S.idler(x, Q, z, a);
}

// a timber pier running out from the quay at x, its deck at quay level
function pier(S: Site, x: number, len: number, hw: number) {
    const { M } = S;
    M.floor = null;
    M.wood(C.PLANK, 0.9).slab(x - hw, x + hw, Q - 0.2, Q, -len, -0.6);
    M.wood(C.DARK);
    for (const s of [-1, 1]) M.slab(x + s * hw - 0.12, x + s * hw + 0.12, Q - 0.42, Q + 0.07, -len, -0.6);
    for (let z = 3, i = 0; z <= len - 1; z += 4, i++) {
        const tall = i % 2 === 0 ? 0.85 : -0.22;
        for (const s of [-1, 1]) M.post(x + s * (hw - 0.02), -9, -z, 0.24, Q + 9 + tall, 6);
        M.beam([x - hw + 0.1, 0.5, -z], [x + hw - 0.1, Q - 0.5, -z], 0.07).beam([x + hw - 0.1, 0.5, -z], [x - hw + 0.1, Q - 0.5, -z], 0.07);
        M.slab(x - hw - 0.25, x + hw + 0.25, Q - 0.46, Q - 0.2, -z - 0.14, -z + 0.14);
        S.solid(x, -z, hw + 0.8);
    }
    // a rope slung between the tall piles
    M.matte(C.ROPE);
    for (const s of [-1, 1])
        for (let z = 3; z + 8 <= len - 1; z += 8) {
            const px = x + s * (hw - 0.02);
            M.beam([px, Q + 0.72, -z], [px, Q + 0.48, -z - 4], 0.028, 0.028, 4).beam([px, Q + 0.48, -z - 4], [px, Q + 0.72, -z - 8], 0.028, 0.028, 4);
        }
}

/** A boarded shed with a shingled roof, its door in the front (-Z) wall. */
export function shed(S: Site, x: number, y: number, z: number, yaw: number, hw: number, hd: number, h: number, c: Rgb, open = false) {
    const { M, G } = S;
    G.push(x, y, z, yaw);
    M.floor = y;
    if (!open) M.block(-hw, hw, -hd, hd, h + 2);
    if (open) {
        // only a roof on posts
        M.wood(C.DARK);
        for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) M.post(sx * (hw - 0.15), 0, sz * (hd - 0.15), 0.12, h, 5);
        M.slab(-hw, hw, h - 0.16, h, -hd, -hd + 0.16).slab(-hw, hw, h - 0.16, h, hd - 0.16, hd);
    } else {
        M.wood(c, 0.9).slab(-hw, hw, 0, h, -hd, hd, 0.03);
        M.face(0, hw, hd);
        M.door(-hw * 0.35, 0.02, 0.9, 1.9);
        M.window(hw * 0.45, h * 0.6, 0.7, 0.7, null);
        G.pop();
        M.face(1, hw, hd);
        M.window(0, h * 0.6, 0.7, 0.7, null);
        G.pop();
    }
    M.roof(hw, hd, h, { pitch: 0.5, over: 0.35, tile: [0.42, 0.36, 0.3], timber: open ? undefined : c });
    G.pop();
}

// a quayside crane: a post, a jib and the treadwheel that works it, with a load in the sling
function crane(S: Site, x: number, y: number, z: number, yaw: number) {
    const { M, G } = S;
    G.push(x, y, z, yaw);
    M.mark(0, 0, 0, 0.9, 5);
    M.wood(C.DARK).slab(-1, 1, 0, 0.22, -1, 1, 0.03).post(0, 0, 0, 0.24, 5.4, 7, 0.19);
    M.beam([0.9, 0.2, 0.9], [0, 2.6, 0], 0.09).beam([-0.9, 0.2, 0.9], [0, 2.6, 0], 0.09);
    M.beam([0, 3.4, 0.5], [0, 6.9, -4.8], 0.15, 0.1, 6).beam([0, 5.4, 0], [0, 6.9, -4.8], 0.045);
    // the treadwheel
    M.wood(C.TIMBER).beam([-0.75, 1.75, 1.5], [-0.3, 1.75, 1.5], 1.55, 1.55, 14);
    M.wood(C.DARK).beam([-1, 1.75, 1.5], [0, 1.75, 1.5], 0.1).post(-1, 0, 1.5, 0.09, 1.8, 5);
    G.sway = 0.1;
    M.matte(C.ROPE).beam([0, 6.9, -4.8], [0, 3.5, -4.8], 0.03, 0.03, 4);
    M.crate(0, 2.5, -4.8, 0.5, 0.4);
    G.sway = 0;
    G.pop();
}

// ---- the shipyard: a hull in frame on the slip, timber, a sawpit under a roof ----
function shipyard(S: Site) {
    const { M, G } = S;
    M.floor = null;
    // the slip runs down from the quay into the basin; in its frame the ramp is the plane y = 0
    G.push(58, Q, -0.6, 0, -0.19);
    M.stone(C.DARKSTONE).slab(-5.2, 5.2, -2.5, 0, -28, 0.5);
    // the slip is walked down as the slope it is; the hull in frame on it is in the way
    M.block(-5.2, 5.2, -28, 0.5, 0, true).block(-2.9, 2.9, -21.5, -2, 6);
    M.wood(C.DARK);
    for (const s of [-1, 1]) M.slab(s * 1.6 - 0.14, s * 1.6 + 0.14, 0, 0.16, -27.5, 0);
    // the hull: keel on its blocks, the frames up and the first strakes on
    const NR = 12,
        ribs: Point[][] = [];
    for (let i = 0; i <= NR; i++) {
        const t = i / NR,
            z = -2.5 - t * 18,
            w = 2.7 * Math.pow(Math.sin(PI * (0.1 + 0.8 * t)), 0.75),
            top = 3.4 + 1.1 * (2 * t - 1) ** 2;
        ribs.push([[0, 0.75, z], [w * 0.6, 1.7, z], [w, 2.9, z], [w * 0.97, 0.75 + top, z]]);
    }
    M.wood(C.TIMBER).slab(-0.17, 0.17, 0.42, 0.78, -21, -2);
    M.beam([0, 0.6, -2], [0, 5.6, -0.9], 0.17, 0.13).beam([0, 0.6, -21], [0, 5.2, -21.7], 0.17, 0.13);
    for (let i = 0; i <= NR; i++) {
        const r = ribs[i];
        for (const s of [-1, 1]) {
            for (let k = 0; k < 3; k++) M.wood(C.TIMBER).beam([s * r[k][0], r[k][1], r[k][2]], [s * r[k + 1][0], r[k + 1][1], r[k + 1][2]], 0.13, 0.11, 5);
            // ribbands holding the frames, and the planking begun at the garboards
            if (i < NR) {
                const q = ribs[i + 1];
                for (const k of [2, 3]) M.beam([s * r[k][0], r[k][1], r[k][2]], [s * q[k][0], q[k][1], q[k][2]], 0.07, 0.07, 4);
                M.wood(C.PLANK, 0.9);
                const strake = [[s * r[0][0], r[0][1], r[0][2]], [s * r[1][0], r[1][1], r[1][2]], [s * q[1][0], q[1][1], q[1][2]], [s * q[0][0], q[0][1], q[0][2]]];
                G.flat(strake, 0, 6, r[0][2]);
                G.flat(strake, 0, -6, r[0][2]);
                if (i > 0 && i < 11 - (s > 0 ? 4 : 0)) {
                    const more = [[s * r[1][0], r[1][1], r[1][2]], [s * r[2][0], r[2][1], r[2][2]], [s * q[2][0], q[2][1], q[2][2]], [s * q[1][0], q[1][1], q[1][2]]];
                    G.flat(more, 0, 3, r[0][2]);
                    G.flat(more, s * 9, 3, r[0][2]);
                }
            }
        }
        // blocks under the keel, shores against the bilge
        if (i % 2 === 0) M.wood(C.DARK).slab(-0.5, 0.5, 0, 0.42, r[0][2] - 0.2, r[0][2] + 0.2);
        if (i % 3 === 1) for (const s of [-1, 1]) M.wood(C.DARK).beam([s * 4.6, 0, r[0][2]], [s * r[2][0], r[2][1], r[2][2]], 0.07);
        // deck beams across the frames amidships
        if (i > 2 && i < 10) M.wood(C.TIMBER).beam([-r[3][0], r[3][1] - 0.5, r[3][2]], [r[3][0], r[3][1] - 0.5, r[3][2]], 0.09, 0.09, 4);
    }
    // staging along one side
    M.wood(C.DARK);
    for (let z = -5; z >= -19; z -= 4.6) M.post(4.4, 0, z, 0.08, 4.6, 4).post(3.5, 0, z, 0.08, 4.6, 4).beam([3.5, 3.1, z], [4.4, 3.1, z], 0.05);
    M.wood(C.PLANK).slab(3.4, 4.5, 3.14, 3.2, -19.2, -4.8);
    M.beam([3.9, 0, -3.5], [3.9, 3.1, -5.2], 0.05);
    G.pop();
    for (const z of [-6, -15, -24]) S.solid(58, z, 6);

    // the yard behind it
    M.floor = Q - 0.1;
    const y = Q - 0.1;
    shed(S, 65, y, 27, 0, 6, 4.4, 3.6, C.TIMBER, true);
    // the sawpit under the roof: a baulk on trestles
    M.wood(C.TIMBER).beam([60.5, y + 1.3, 27], [69.5, y + 1.3, 27], 0.3, 0.3, 7);
    M.wood(C.DARK);
    for (const x of [61.5, 68.5]) M.slab(x - 0.1, x + 0.1, y, y + 1, 26.3, 27.7);
    // seasoning timber: stacked logs and planks
    for (const [x, z, n] of [[51.5, 19, 3], [51.5, 23.5, 2]]) {
        for (let row = 0; row < n; row++) for (let k = 0; k < n - row; k++) M.wood([0.44, 0.33, 0.22]).beam([x - 3.2, y + 0.3 + row * 0.5, z + (k - (n - row - 1) / 2) * 0.6], [x + 3.2, y + 0.3 + row * 0.5, z + (k - (n - row - 1) / 2) * 0.6], 0.29, 0.26, 7);
    }
    for (let k = 0; k < 6; k++) M.wood(C.PLANK, 0.9).slab(67, 73, y + k * 0.09, y + k * 0.09 + 0.07, 17.2 + (k % 2) * 0.1, 18.6 + (k % 2) * 0.1);
    shed(S, 50.5, y, 31.5, PI / 2, 2.6, 2.2, 2.6, [0.4, 0.34, 0.28]);
    M.cargo(70.5, y, 22, 5, 1.4).cargo(48, y, 15.5, 3, 1);
    // a tar pot on the boil
    M.iron().post(63.5, y, 18.5, 0.42, 0.55, 8, 0.5);
    S.T.flames.push(S.at(63.5, y + 0.7, 18.5));
    M.lights.push({ x: S.at(63.5, 0, 18.5)[0], y: y + 1.2, z: S.at(63.5, 0, 18.5)[2], r: 11, g: 5, b: 1.4, rad: 22, glow: 0.9 });
    // an anchor waiting for its ship
    M.iron().beam([71, y + 0.12, 13.5], [73.6, y + 0.3, 14.6], 0.07).beam([70.6, y + 0.1, 14.4], [71.4, y + 0.1, 12.6], 0.08, 0.05).beam([73.3, y + 0.3, 13.8], [73.9, y + 0.3, 15.3], 0.05);
    for (const [x, z, a] of [[55, 4, 3], [61, 3.2, 3.3], [63, 24.5, 0], [66.5, 29.5, PI], [50, 21.5, -1.6]]) S.idler(x, x < 62 && z < 5 ? Q : y, z, a);
    S.walk(2, [[49, y, 14.5], [73, y, 15.5], [73, y, 33], [58, y, 33.5], [49, y, 27]]);
}

// ---- the fishermen's beach: boats hauled out, nets drying, shacks ----
function beach(S: Site) {
    const { M, G } = S;
    M.floor = null;
    const ground = (lx: number, lz: number) => {
        const [x, z] = toWorld(lx, lz);
        return height(x, z);
    };
    for (const [x, z, yaw, roll, c] of [[-70, 4.5, 0.3, 0.3, 0], [-76.5, 6.5, -0.2, -0.26, 1], [-81, 10, 0.9, 0.3, 2]]) {
        G.push(x, ground(x, z) + 0.32, z, yaw, 0.04, roll);
        boatHull(G, 4.8, 1.6, 0.62, SHUTTERS[c]);
        G.pop();
        M.wood(C.DARK).beam([x - 1.2, ground(x - 1.2, z + 0.4), z + 0.4], [x - 0.6, ground(x, z) + 0.55, z + 0.3], 0.05);
    }
    // nets hung out to dry
    for (const [x, z, yaw] of [[-72, 13, 0.2], [-80, 17, -0.5]]) {
        const y = ground(x, z);
        G.push(x, y, z, yaw);
        M.wood(C.DARK).post(-2.4, -0.3, 0, 0.07, 2.5, 4).post(2.4, -0.3, 0, 0.07, 2.5, 4).beam([-2.5, 2.1, 0], [2.5, 2.1, 0], 0.045);
        for (let i = 0; i < 4; i++) {
            const a = -2.3 + i * 1.15;
            M.cloth([0.3, 0.34, 0.27]).sheet([[a, 2.1, 0], [a + 1.1, 2.1, 0], [a + 1.05, 0.5 + (i % 2) * 0.3, 0.25], [a + 0.05, 0.4, 0.25]], [0, 0, 0.22, 0.22]);
        }
        G.pop();
    }
    const y = Q - 0.1;
    hut(S, -77, y, 23, 0.25, 2.8, 2.3);
    hut(S, -72.5, y, 33.5, -0.3, 2.5, 2.2);
    // a fire on the sand, fish smoking over it
    const fy = ground(-75.5, 14.5);
    M.wood(C.DARK).beam([-76.1, fy, 14.3], [-74.9, fy + 0.25, 14.8], 0.09).beam([-75.2, fy, 13.9], [-75.8, fy + 0.25, 15.1], 0.09);
    M.beam([-76.4, fy, 14.5], [-75.5, fy + 1.5, 14.5], 0.04).beam([-74.6, fy, 14.5], [-75.5, fy + 1.5, 14.5], 0.04);
    S.T.flames.push(S.at(-75.5, fy + 0.3, 14.5));
    M.lights.push({ x: S.at(-75.5, 0, 14.5)[0], y: fy + 1, z: S.at(-75.5, 0, 14.5)[2], r: 12, g: 5.5, b: 1.5, rad: 24, glow: 1 });
    M.floor = y;
    M.cargo(-68, y, 20, 4, 1.2);
    for (const [x, z, a] of [[-74.2, 15.6, -2.3], [-76.8, 15.4, 2.2], [-69.2, 6.2, 1.2], [-79, 15.5, 0.6]]) S.idler(x, ground(x, z), z, a);
}

// a fisherman's shack: boards and palm thatch
function hut(S: Site, x: number, y: number, z: number, yaw: number, hw: number, hd: number) {
    const { M, G } = S;
    G.push(x, y, z, yaw);
    M.floor = y;
    M.block(-hw, hw, -hd, hd, 4);
    M.wood([0.5, 0.42, 0.3], 0.95).slab(-hw, hw, -0.5, 2.3, -hd, hd, 0.03);
    M.face(0, hw, hd);
    M.door(0.5, 0, 0.9, 1.85);
    M.window(-hw * 0.5, 1.4, 0.7, 0.7, M.pick(SHUTTERS));
    // a lean-to porch on two poles
    M.wood(C.DARK).post(-hw + 0.1, 0, -1.9, 0.06, 2.05, 4).post(hw - 0.1, 0, -1.9, 0.06, 2.05, 4);
    M.leaf(C.THATCH);
    G.flat([[-hw - 0.2, 2.5, 0.1], [hw + 0.2, 2.5, 0.1], [hw + 0.2, 2.0, -2.1], [-hw - 0.2, 2.0, -2.1]], 0, -5, 0);
    G.flat([[-hw - 0.2, 2.42, 0.1], [hw + 0.2, 2.42, 0.1], [hw + 0.2, 1.92, -2.1], [-hw - 0.2, 1.92, -2.1]], 0, 50, 0);
    G.pop();
    M.roof(hw, hd, 2.3, { pitch: 0.85, over: 0.5, thatch: true, timber: [0.5, 0.42, 0.3] });
    G.pop();
}

// ---- the market square behind the wharf ----
function plaza(S: Site) {
    const { M, G } = S;
    M.floor = Q;
    M.stone(C.PALE).slab(-18, 18, Q - 0.5, Q + 0.03, 13, 35.4);
    // the fountain: an eight-sided basin, a column and a bowl
    const fz = 24;
    M.mark(0, Q, fz, 3.3, 0.8);
    M.stone().prism(M.ngon(0, fz, 3.3, 8), M.ngon(0, fz, 3.3, 8), Q, Q + 0.8, false);
    M.prism(M.ngon(0, fz, 2.8, 8), M.ngon(0, fz, 2.8, 8), Q + 0.3, Q + 0.8, false, true);
    const out = M.ngon(0, fz, 3.3, 8),
        inn = M.ngon(0, fz, 2.8, 8);
    for (let i = 0; i < 8; i++) G.flat([[out[i][0], Q + 0.8, out[i][1]], [out[(i + 1) % 8][0], Q + 0.8, out[(i + 1) % 8][1]], [inn[(i + 1) % 8][0], Q + 0.8, inn[(i + 1) % 8][1]], [inn[i][0], Q + 0.8, inn[i][1]]], 0, -9, fz);
    M.stone(C.PALE).prism(M.ngon(0, fz, 3.55, 8), M.ngon(0, fz, 3.55, 8), Q, Q + 0.18);
    M.paint([0.16, 0.42, 0.44], 0.06).prism(inn, inn, Q + 0.5, Q + 0.62);
    M.stone(C.PALE, 0.4);
    G.push(0, Q + 0.3, fz).lathe([[0.55, 0, 1, 0], [0.34, 0.5, 1, 0.3], [0.3, 1.9, 1, 0], [1.25, 2.4, 0.3, -1], [1.3, 2.62, 1, 0], [1.15, 2.62, 0, 1], [0.2, 2.5, 0, 1], [0.14, 3.2, 1, 0.2], [0, 3.35, 0, 1]], 10).pop();
    M.paint([0.16, 0.42, 0.44], 0.06).post(0, Q + 2.84, fz, 1.14, 0.05, 10);
    // stalls round the square
    const spots = [[-12, 16.8, 0.15], [-13.5, 23.5, PI / 2], [-12, 31, PI - 0.2], [12, 16.8, -0.15], [13.5, 24.5, -PI / 2], [11.5, 31.5, PI + 0.2], [-5, 32.6, PI], [5.5, 15.6, 0]];
    spots.forEach(([x, z, a], i) => {
        M.stall(x, Q + 0.03, z, a, AWNINGS[i % AWNINGS.length]);
        // the stallholder behind the trestle, and a customer in front of it
        S.idler(x + Math.sin(a) * 1.3, Q + 0.03, z + Math.cos(a) * 1.3, a);
        if (i % 3 !== 1) S.idler(x - Math.sin(a) * 1.5 + Math.cos(a) * 0.5, Q + 0.03, z - Math.cos(a) * 1.5, a + PI);
    });
    M.cargo(-7, Q + 0.03, 17, 3, 1).cargo(8, Q + 0.03, 31, 3, 1).cart(-8, Q + 0.03, 28.5, 1.9).cart(7.5, Q + 0.03, 20, -0.6);
    for (const s of [-1, 1]) {
        M.bench(s * 5.2, Q + 0.03, fz, PI / 2).bench(0, Q + 0.03, fz + s * 5.2, 0);
        M.lampPost(s * 16.4, Q, 34, 3.8, -s * 0.5).lampPost(s * 16.6, Q, 14.4, 3.8, -s * 0.5);
    }
    // market day: pennants strung across the square from lamp to lamp
    bunting(S, [-16.9, Q + 3.7, 14.4], [16.9, Q + 3.7, 34]);
    bunting(S, [16.9, Q + 3.7, 14.4], [-16.9, Q + 3.7, 34]);
    bunting(S, [-16.9, Q + 3.7, 34], [16.9, Q + 3.7, 34]);
    S.walk(4, [[-4.5, Q, 19.5], [4.5, Q, 19.5], [6.2, Q, 24], [4.5, Q, 28.6], [-4.5, Q, 28.6], [-6.2, Q, 24]]);
    S.walk(3, [[-9, Q, 14], [9, Q, 14.4], [15.6, Q, 20], [15.6, Q, 29], [9, Q, 34.2], [-9, Q, 34.2], [-15.6, Q, 29], [-15.6, Q, 20]]);
    S.idler(4.6, Q + 0.03, fz + 0.6, -PI / 2);
    S.idler(-0.6, Q + 0.03, fz + 4.6, PI);
}

// a line of pennants slung between two points, lifting in the wind
function bunting(S: Site, a: number[], b: number[]) {
    const { M } = S,
        n = Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.8),
        at = (t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(PI * t) * 0.9, a[2] + (b[2] - a[2]) * t];
    for (let i = 0; i < n; i++) {
        const p = at(i / n),
            q = at((i + 1) / n);
        M.matte(C.ROPE).beam(p, q, 0.012, 0.012, 3);
        M.cloth(AWNINGS[i % AWNINGS.length]).sheet([p, q, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 0.62, (p[2] + q[2]) / 2]], [0.04, 0.04, 0.3]);
    }
}

// ---- the two terrace walls, their promenades and the stairs up them ----
function terraces(S: Site) {
    const { M } = S,
        xa = P.left + 2,
        xb = P.right - 2;
    const terrace = (zw: number, y0: number, y1: number, gaps: number[][]) => {
        M.floor = y0;
        M.stone().slab(xa, xb, y0 - 1.5, y1, zw, zw + 13);
        // from below it is a wall; from its own level it is the ground
        M.block(xa, xb, zw, zw + 13, y1, true);
        for (let x = xa + 5; x < xb; x += 9.5) if (!gaps.some((g) => x > g[0] - 1.2 && x < g[1] + 1.2)) M.prism([[x - 0.8, zw - 1.1], [x + 0.8, zw - 1.1], [x + 0.8, zw], [x - 0.8, zw]], [[x - 0.6, zw - 0.25], [x + 0.6, zw - 0.25], [x + 0.6, zw], [x - 0.6, zw]], y0 - 0.5, y1 - 0.7);
        // the parapet, broken where a stair comes up
        M.floor = y1;
        let x = xa;
        for (const g of [...gaps, [xb, xb]]) {
            if (g[0] > x) {
                M.block(x, g[0], zw, zw + 0.45, y1 + 0.9, true);
                M.stone().slab(x, g[0], y1, y1 + 0.9, zw, zw + 0.45);
                M.stone(C.PALE).slab(x - 0.05, g[0] + 0.05, y1 + 0.9, y1 + 1.02, zw - 0.07, zw + 0.52, 0.03);
            }
            x = g[1];
        }
    };
    terrace(P.wall1, Q, MID, [[-70.5, -65.5], [-4.6, 4.6], [65.5, 70.5]]);
    terrace(P.wall2, MID, TOP, [[-52.5, -47.5], [-4.1, 4.1], [45.5, 50.5]]);
    // the grand stair on the town's axis, and narrower flights toward either end
    M.floor = Q;
    M.stairs(0, 35.2, Q, P.wall1 + 0.05, MID, 8.2);
    M.stairs(-68, 38, Q - 0.1, P.wall1 + 0.05, MID, 4).stairs(68, 38, Q - 0.1, P.wall1 + 0.05, MID, 4);
    M.floor = MID;
    M.stairs(0, 75, MID, P.wall2 + 0.05, TOP, 7.2);
    M.stairs(-50, 77, MID - 0.1, P.wall2 + 0.05, TOP, 4).stairs(48, 77, MID - 0.1, P.wall2 + 0.05, TOP, 4);
    // the little square at the head of the first stair, with a column to some forgotten admiral
    M.stone(C.PALE).slab(-11, 11, MID - 0.6, MID + 0.03, 58.8, 75.2);
    M.block(-1.3, 1.3, 65.2, 67.8, MID + 8);
    M.stone().slab(-1.3, 1.3, MID, MID + 0.5, 65.2, 67.8, 0.05).slab(-0.9, 0.9, MID + 0.5, MID + 1.6, 65.6, 67.4, 0.05);
    M.stone(C.PALE, 0.4).post(0, MID + 1.6, 66.5, 0.42, 4.6, 10, 0.34);
    M.stone(C.PALE).slab(-0.6, 0.6, MID + 6.2, MID + 6.45, 65.9, 67.1, 0.04);
    M.iron([0.3, 0.26, 0.14]).G.push(0, MID + 6.9, 66.5).sphere(0.45, 9, 6).pop();
    for (const s of [-1, 1]) {
        M.lampPost(s * 5.6, MID, P.wall1 + 1.3, 3.6, -s * 0.5).lampPost(s * 5.2, TOP, P.wall2 + 1.3, 3.6, -s * 0.5);
        M.lampPost(s * 38, MID, P.wall1 + 1.2, 3.6).lampPost(s * 62, MID, P.wall1 + 1.2, 3.6).lampPost(s * 30, TOP, P.wall2 + 1.2, 3.6);
        M.bench(s * 8.5, MID + 0.03, 62, PI / 2).bench(s * 8.5, MID + 0.03, 71, PI / 2);
    }
    // the way up through the town: square, stair, column, stair, the governor's gate, and back down
    S.walk(5, [[2.6, Q, 33.5], [2.6, Q, 35.2], [2.6, MID, 46.2], [5, MID, 60], [5, MID, 73], [2.4, MID, 75], [2.4, TOP, 86.2], [9, TOP, 93.5], [-9, TOP, 93.5], [-2.4, TOP, 86.2], [-2.4, MID, 75], [-5, MID, 73], [-5, MID, 60], [-2.6, MID, 46.2], [-2.6, Q, 35.2], [-2.6, Q, 33.5]]);
    S.walk(6, [[-78, MID, 48.6], [-8, MID, 49.2], [70, MID, 48.6], [70, MID, 56.5], [8, MID, 57], [-78, MID, 56.5]]);
    S.walk(4, [[-72, TOP, 88.6], [66, TOP, 88.6], [66, TOP, 96], [26, TOP, 96.6], [10, TOP, 93], [-10, TOP, 93], [-26, TOP, 96.6], [-72, TOP, 96]]);
    for (const [x, y, z, a] of [[-20, MID, 47.4, PI], [-21, MID, 47.5, PI], [33, MID, 47.4, PI], [-9.5, MID, 62, PI / 2], [7.6, MID, 71, -PI / 2], [-40, TOP, 87.4, PI], [18, TOP, 87.3, PI], [19, TOP, 87.5, PI - 0.4]]) S.idler(x, y, z, a);
}

interface House {
    x: number;
    z: number;
    y: number;
    yaw?: number;
    hw: number;
    hd: number;
    floors: number;
    wall?: Rgb;
    hip?: boolean;
    /** a gable to the street */
    along?: boolean;
    /** walls with a neighbour hard against them, left then right in the house's own frame */
    blind?: boolean[];
    balcony?: boolean;
    shop?: boolean;
    lamp?: boolean;
    /** height of each storey */
    storey?: number;
}

/** A plastered town house on a stone plinth: shuttered windows, a tiled roof, chimneys, perhaps a balcony or a shop. */
export function house(S: Site, o: House) {
    const { M, G } = S,
        { hw, hd, floors } = o,
        FH = o.storey ?? 2.9,
        H = 0.5 + floors * FH,
        wall = o.wall ?? M.pick(PLASTERS),
        shut = M.R() < 0.88 ? M.pick(SHUTTERS) : null,
        tile = M.pick(TILES),
        blind = o.blind ?? [false, false],
        pitch = M.rr(0.5, 0.68);
    G.push(o.x, o.y, o.z, o.yaw ?? 0);
    M.floor = o.y;
    M.block(-hw - 0.12, hw + 0.12, -hd - 0.12, hd + 0.12, H + 6);
    M.stone().slab(-hw - 0.12, hw + 0.12, -2.5, 0.5, -hd - 0.12, hd + 0.12, 0.04);
    M.plaster(wall).slab(-hw, hw, 0.5, H, -hd, hd, 0.03);
    M.stone(C.PALE);
    for (let f = 1; f < floors; f++) M.slab(-hw - 0.07, hw + 0.07, 0.42 + f * FH, 0.58 + f * FH, -hd - 0.07, hd + 0.07);
    M.slab(-hw - 0.14, hw + 0.14, H - 0.22, H, -hd - 0.14, hd + 0.14, 0.03);
    const top = M.roof(hw, hd, H, { hip: o.hip, along: o.along, tile, wall, pitch });

    for (let side = 0; side < 4; side++) {
        if ((side === 1 && blind[1]) || (side === 3 && blind[0])) continue;
        const half = M.face(side, hw, hd),
            n = Math.max(1, Math.floor((2 * half - 0.7) / 2.3)),
            step = (2 * half) / n,
            doorBay = side === 0 ? (n > 2 ? 1 + ((M.R() * (n - 2)) | 0) : 0) : -1;
        for (let f = 0; f < floors; f++)
            for (let i = 0; i < n; i++) {
                const x = (i + 0.5) * step - half,
                    y = 0.5 + f * FH + FH * 0.53;
                if (f === 0 && i === doorBay) {
                    M.door(x, 0.5, 1.15, 2.15, M.R() < 0.5 ? C.DARK : M.pick(SHUTTERS));
                    if (o.lamp) {
                        M.iron().beam([x + 0.95, 2.85, 0], [x + 0.95, 2.9, -0.4], 0.03);
                        M.lantern(x + 0.95, 2.55, -0.4, 20, 0.8);
                    }
                } else if (f === 0 && side === 0 && o.shop) M.window(x, 0.5 + FH * 0.5, Math.min(1.7, step - 0.6), 1.5, null, M.R() < 0.7);
                else if (side !== 0 && M.R() < 0.22) continue;
                else if (f === 1 && side === 0 && o.balcony && i === doorBay) M.window(x, 0.5 + FH + 1.1, 1.05, 2.1, shut);
                else M.window(x, y, 0.95, 1.4, shut);
            }
        if (side === 0 && o.balcony && floors > 1) M.balcony((doorBay + 0.5) * step - half, 0.5 + FH, Math.min(step * 1.5, 2 * half - 0.5), 1.05);
        if (side === 0 && o.shop) M.awning(0, 0.5 + FH - 0.2, 2 * half - 0.8, 1.8, M.pick(AWNINGS));
        G.pop();
    }
    // chimneys, some of them drawing
    const stacks = 1 + (M.R() < 0.4 ? 1 : 0);
    for (let c = 0; c < stacks; c++) {
        const cx = (c ? -1 : 1) * hw * M.rr(0.35, 0.7),
            cz = hd * M.rr(-0.25, 0.4),
            smoke = M.chimney(cx, cz, H - 0.2, top + M.rr(0.5, 1), wall);
        if (M.R() < 0.4) S.T.smokes.push(smoke);
    }
    // a dormer or two in the front slope of a plain roof
    if (!o.hip && !o.along && hd > 3.4 && M.R() < 0.4) {
        const nd = hw > 4.6 ? 2 : 1;
        for (let d = 0; d < nd; d++) M.dormer(nd === 1 ? 0 : (d ? 1 : -1) * hw * 0.45, H, hd, pitch, wall, tile);
    }
    G.pop();
}

// a street of houses shoulder to shoulder from x0 to x1, their fronts on the line zf
function row(S: Site, x0: number, x1: number, zf: number, depth: number, y: number, inland = false, grand = 0) {
    const { M } = S;
    let x = x0,
        joined = false;
    while (x < x1 - 4) {
        let w = M.rr(7.2, 11);
        if (x1 - (x + w) < 6.5) w = x1 - x;
        const alley = x + w < x1 - 4 && M.R() < 0.3,
            hd = (depth / 2) * M.rr(0.84, 1),
            floors = M.R() < 0.3 + grand ? 3 : 2,
            blind = inland ? [!alley && x + w < x1 - 4, joined] : [joined, !alley && x + w < x1 - 4];
        house(S, {
            x: x + w / 2, z: inland ? zf - hd : zf + hd, y, yaw: inland ? PI : 0, hw: w / 2 - 0.03, hd, floors, blind,
            along: M.R() < 0.16, balcony: M.R() < 0.45, shop: M.R() < 0.3, lamp: M.R() < 0.3, storey: M.rr(2.75, 3.1),
        });
        joined = !alley;
        x += w + (alley ? 1.8 : 0);
    }
}

// ---- the lower town: warehouses, the tavern and the customs house on the quay, a street behind ----
function lowerTown(S: Site) {
    const { M } = S,
        y = Q - 0.1;
    warehouse(S, -50, y, 21, 9.5, 6.6);
    tavern(S, -28.5, y, 20.5);
    customsHouse(S, 30.5, y, 21);
    row(S, -62, -21, 31.8, 11.4, y);
    row(S, 21, 45.5, 31.8, 11.4, y);
    M.floor = y;
    M.cargo(-36.5, y, 28.5, 3, 0.9).cargo(44, y, 29.8, 4, 1.2);
    S.walk(3, [[-61, y, 28.4], [-21, y, 28.6], [-19.5, y, 30], [-21, y, 30.4], [-61, y, 30.2]]);
    S.walk(2, [[20, y, 28.5], [46, y, 28.5], [47.5, y, 30], [46, y, 30.6], [20, y, 30.4]]);
    S.walk(2, [[-66.8, y, 30], [-66.8, y, 38], [-66.8, MID, 46.3], [-62, MID, 49], [-69.4, MID, 46.3], [-69.4, y, 38], [-69.4, y, 30]]);
    S.walk(1, [[66.8, y, 36], [66.8, y, 38], [66.8, MID, 46.3], [62, MID, 49], [69.4, MID, 46.3], [69.4, y, 38], [69.4, y, 36]]);
}

// ---- the middle terrace: the church, and houses looking over the roofs below ----
function middleTown(S: Site) {
    const { M } = S,
        y = MID - 0.1;
    church(S, -22, y, 72);
    row(S, -82, -35, 60, 11, y, false, 0.15);
    row(S, 13, 73, 60, 11, y, false, 0.15);
    M.floor = y;
    // back gardens under the upper wall: walls, a washing line or two
    for (const [x0, x1] of [[-78, -56], [22, 42], [54, 70]]) {
        M.block(x0, x0 + 0.4, 71.5, 85.6, y + 1.5, true).block(x1, x1 + 0.4, 71.5, 85.6, y + 1.5, true);
        M.stone().slab(x0, x0 + 0.4, y - 0.5, y + 1.5, 71.5, 85.6).slab(x1, x1 + 0.4, y - 0.5, y + 1.5, 71.5, 85.6);
        const mx = (x0 + x1) / 2;
        M.wood(C.DARK).post(x0 + 2, y, 79, 0.05, 2.3, 4).post(x1 - 2, y, 79, 0.05, 2.3, 4);
        M.matte(C.ROPE).beam([x0 + 2, y + 2.2, 79], [x1 - 2, y + 2.2, 79], 0.02, 0.02, 3);
        for (let x = x0 + 3; x < x1 - 3.4; x += M.rr(1.1, 2.2)) {
            const w = M.rr(0.6, 1.1),
                d = M.rr(0.7, 1.3);
            M.cloth(M.pick([C.CANVAS, [0.9, 0.9, 0.86], [0.6, 0.3, 0.26], [0.36, 0.46, 0.6], [0.8, 0.7, 0.4]])).sheet([[x, y + 2.2, 79], [x + w, y + 2.2, 79], [x + w, y + 2.2 - d, 79], [x, y + 2.2 - d, 79]], [0.03, 0.03, 0.4, 0.4]);
        }
        S.idler(mx, y, 80, 0);
    }
    S.walk(2, [[-49, y, 73], [-49, y, 77], [-49, TOP, 86.3], [-44, TOP, 89], [-51, TOP, 86.3], [-51, y, 77], [-51, y, 73]]);
    S.walk(2, [[47, y, 73], [47, y, 77], [47, TOP, 86.3], [52, TOP, 89], [49, TOP, 86.3], [49, y, 77], [49, y, 73]]);
}

// ---- the governor's terrace ----
function upperTown(S: Site) {
    const { M } = S,
        y = TOP - 0.1;
    mansion(S, 0, y, 107);
    for (const [x, hw] of [[-64, 7.4], [-41, 7], [41, 7], [62.5, 7.4]])
        house(S, { x, z: 100.6 + 5.6, y, hw, hd: 5.6, floors: 2, hip: true, balcony: true, lamp: true, storey: 3.2, wall: M.pick([PLASTERS[1], PLASTERS[0], PLASTERS[4], PLASTERS[7]]) });
    M.floor = TOP;
    // the governor's forecourt: saluting guns, the colours, clipped hedges
    for (const s of [-1, 1]) {
        M.cannon(s * 7.5, TOP + 0.03, P.wall2 + 2.4, 0, 1.1);
        M.shot(s * 7.5 + 0.9, TOP + 0.03, P.wall2 + 3.2);
        for (let k = 0; k < 5; k++) M.bush(s * (12.5 + k * 2.1), TOP, 97.2, 1);
    }
    M.wood(C.PALE, 0.6).post(-12, TOP, 90, 0.12, 12.5, 6, 0.06);
    M.iron([0.6, 0.5, 0.2]).G.push(-12, TOP + 12.6, 90).sphere(0.16, 6, 4).pop();
    M.flag(-11.9, TOP + 11.3, 90, 4.4, 2.6, [0.74, 0.12, 0.1], [0.9, 0.78, 0.24]);
    S.idler(-3.4, TOP + 0.8, 99, 0);
    S.idler(3.4, TOP + 0.8, 99, 0);
}

// ---- trees and shrubs: palms in the squares and gardens, scrub at the town's edges ----
function greenery(S: Site) {
    const { M } = S,
        ground = (lx: number, lz: number) => {
            const [x, z] = toWorld(lx, lz);
            return height(x, z);
        };
    M.floor = null;
    // palms in stone planters at the corners of the squares
    for (const [x, z, y] of [[-16, 15.6, Q], [16, 15.6, Q], [-16, 33, Q], [16, 33, Q], [-9.4, 60.6, MID], [9.4, 60.6, MID], [-9.4, 73.4, MID], [9.4, 73.4, MID], [-27, 96, TOP], [27, 96, TOP]]) {
        M.stone().prism(M.ngon(x, z, 1.05, 8), M.ngon(x, z, 0.95, 8), y, y + 0.55);
        M.palm(x, y + 0.4, z, M.rr(0.95, 1.2));
    }
    // and loose about the gardens, the beach and the town's flanks
    const spots: number[][] = [];
    for (let tries = 0; spots.length < 46 && tries < 900; tries++) {
        const zone = M.R(),
            x = zone < 0.5 ? M.rr(-80, 72) : zone < 0.75 ? M.rr(-100, -72) : M.rr(-84, 74),
            z = zone < 0.5 ? M.rr(72.5, 84.5) : zone < 0.75 ? M.rr(8, 110) : M.rr(114.5, 124);
        // clear of the church, the stairs and the mansion's back
        if (zone < 0.5 && ((x > -36 && x < 13) || Math.abs(x + 50) < 4 || Math.abs(x - 48) < 4)) continue;
        if (zone >= 0.5 && zone < 0.75 && x > -84 && z > 18 && z < 46) continue;
        if (spots.some((p) => Math.hypot(p[0] - x, p[1] - z) < 4.5)) continue;
        const y = ground(x, z);
        if (y < 1.4) continue;
        spots.push([x, z]);
        if (M.R() < 0.72) M.palm(x, y - 0.3, z, M.rr(0.8, 1.25));
        else M.bush(x, y - 0.2, z, M.rr(0.8, 1.6));
    }
    for (let i = 0; i < 26; i++) {
        const x = M.rr(-82, 72),
            z = M.R() < 0.5 ? M.rr(72.5, 85) : M.rr(114, 120);
        if ((x > -36 && x < 13 && z < 90) || Math.abs(x + 50) < 4 || Math.abs(x - 48) < 4) continue;
        M.bush(x, ground(x, z) - 0.2, z, M.rr(0.5, 1.1));
    }
    // weed-hung rocks at the foot of the fort and along the mole
    for (let i = 0; i < 26; i++) {
        const fortSide = i < 14,
            a = M.rr(0, TAU),
            x = fortSide ? P.fort.x + Math.cos(a) * M.rr(20, 27) : P.mole.x + (M.R() < 0.5 ? -1 : 1) * M.rr(5, 7.5),
            z = fortSide ? P.fort.z + Math.sin(a) * M.rr(20, 27) : M.rr(-70, 0),
            s = M.rr(0.8, 2.2);
        M.paint([M.rr(0.3, 0.4), M.rr(0.3, 0.38), 0.33], 0.88);
        S.G.push(x, ground(x, z) - 0.3 * s, z, M.rr(0, TAU), M.rr(-0.3, 0.3), M.rr(-0.3, 0.3), s * M.rr(0.8, 1.5), s * M.rr(0.5, 1), s * M.rr(0.8, 1.4))
            .sphere(1, 7, 5)
            .pop();
    }
}
