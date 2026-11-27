import { PI, TAU } from '@ryqndev/kiln-math';

import { HB, PLAN as P, toWorld } from './harbour';
import { C, PLASTERS, type Rgb, SHUTTERS, TILES } from './mason';
import { height } from './terrain';
import type { Site } from './town';

const RED: Rgb = [0.72, 0.13, 0.1],
    GOLD: Rgb = [0.9, 0.76, 0.24],
    BRASS: Rgb = [0.62, 0.5, 0.2];

/** A twin-gabled warehouse on the quay: cart doors below, loft doors and hoists in the gables. Front toward -Z. */
export function warehouse(S: Site, x: number, y: number, z: number, hw: number, hd: number) {
    const { M, G } = S,
        H = 7.4,
        wall = PLASTERS[2],
        shut = SHUTTERS[1];
    G.push(x, y, z);
    M.floor = y;
    M.stone().slab(-hw - 0.15, hw + 0.15, -2.5, 3.3, -hd - 0.15, hd + 0.15, 0.04);
    M.plaster(wall).slab(-hw, hw, 3.3, H, -hd, hd, 0.03);
    M.stone(C.PALE).slab(-hw - 0.12, hw + 0.12, H - 0.2, H, -hd - 0.12, hd + 0.12, 0.03);
    for (const s of [-1, 1]) {
        G.push((s * hw) / 2, 0, 0);
        M.roof(hw / 2, hd, H, { along: true, wall, pitch: 0.62, over: 0.4, tile: TILES[1] });
        G.pop();
    }
    M.face(0, hw, hd);
    for (const s of [-1, 1]) {
        const dx = (s * hw) / 2;
        M.stone(C.PALE).slab(dx - 1.75, dx + 1.75, 0, 3.5, -0.08, 0.02);
        M.wood(C.DARK).slab(dx - 1.5, dx + 1.5, 0, 3.2, -0.13, 0);
        M.iron().slab(dx - 1.5, dx + 1.5, 0.8, 0.92, -0.16, -0.13).slab(dx - 1.5, dx + 1.5, 2.3, 2.42, -0.16, -0.13).slab(dx - 0.03, dx + 0.03, 0, 3.2, -0.15, -0.13);
        // the loft door under its hoist, a sack on the fall
        M.wood(C.TIMBER).slab(dx - 0.75, dx + 0.75, 4.3, 6.3, -0.1, 0);
        M.wood(C.DARK).beam([dx, H + 1.6, 0.4], [dx, H + 1.6, -1.8], 0.11);
        G.sway = 0.07;
        M.matte(C.ROPE).beam([dx, H + 1.6, -1.6], [dx, 5.6, -1.6], 0.025, 0.025, 4);
        M.paint(C.BURLAP, 0.95);
        G.push(dx, 5.3, -1.6, 0, 0, 0, 0.36, 0.5, 0.3).sphere(1, 7, 5).pop();
        G.sway = 0;
        for (const k of [-1, 1]) M.window(dx + k * 2.9, 5.2, 0.8, 1.05, shut);
    }
    M.iron().beam([0, 3.75, 0], [0, 3.8, -0.5], 0.03);
    M.lantern(0, 3.45, -0.5);
    G.pop();
    for (const side of [1, 3]) {
        M.face(side, hw, hd);
        for (const k of [-1, 0, 1]) M.window(k * 3.6, 5.2, 0.8, 1.05, shut).window(k * 3.6, 1.9, 0.8, 0.8, null, false);
        G.pop();
    }
    M.face(2, hw, hd);
    M.door(-hw * 0.5, 0, 1.2, 2.2);
    for (const k of [-0.1, 0.5]) M.window(hw * k, 5.2, 0.8, 1.05, shut);
    G.pop();
    G.pop();
}

/** The tavern: a galleried front the length of the house, a swinging sign, tables in the street. Front toward -Z. */
export function tavern(S: Site, x: number, y: number, z: number) {
    const { M, G } = S,
        hw = 7.2,
        hd = 5.8,
        FH = 3.1,
        H = 0.5 + 2 * FH,
        wall = PLASTERS[3],
        shut = SHUTTERS[0],
        gy = 0.5 + FH,
        gd = 2.5;
    G.push(x, y, z);
    M.floor = y;
    M.stone().slab(-hw - 0.12, hw + 0.12, -2.5, 0.5, -hd - 0.12, hd + 0.12, 0.04);
    M.plaster(wall).slab(-hw, hw, 0.5, H, -hd, hd, 0.03);
    M.stone(C.PALE).slab(-hw - 0.07, hw + 0.07, gy - 0.08, gy + 0.08, -hd - 0.07, hd + 0.07).slab(-hw - 0.14, hw + 0.14, H - 0.22, H, -hd - 0.14, hd + 0.14, 0.03);
    const top = M.roof(hw, hd, H, { tile: TILES[1], wall, pitch: 0.66 });
    for (const dx of [-4.4, 0, 4.4]) M.dormer(dx, H, hd, 0.66, wall, TILES[1]);
    for (const dx of [-5, 4.6]) S.T.smokes.push(M.chimney(dx, 1.2, H - 0.2, top + 0.9, wall));

    M.face(0, hw, hd);
    // the gallery: posts from the street to its floor, and from its rail to the lean-to roof
    M.wood(C.TIMBER).slab(-hw, hw, gy - 0.14, gy, -gd, 0);
    M.wood(C.DARK);
    for (let i = 0; i < 5; i++) {
        const px = -hw + 0.15 + (i * (2 * hw - 0.3)) / 4;
        M.post(px, -0.1, -gd + 0.12, 0.1, gy, 5).post(px, gy, -gd + 0.12, 0.08, H - gy - 0.75, 5);
    }
    M.rail([-hw + 0.1, gy, -gd + 0.1], [hw - 0.1, gy, -gd + 0.1]).rail([-hw + 0.1, gy, 0], [-hw + 0.1, gy, -gd + 0.1]).rail([hw - 0.1, gy, 0], [hw - 0.1, gy, -gd + 0.1]);
    const eave = [[-hw - 0.2, H - 0.12, 0], [hw + 0.2, H - 0.12, 0], [hw + 0.2, H - 0.95, -gd - 0.4], [-hw - 0.2, H - 0.95, -gd - 0.4]];
    M.tile(TILES[1]);
    G.flat(eave, 0, 0, 0);
    M.wood(C.DARK);
    G.flat(eave.map((p) => [p[0], p[1] - 0.08, p[2]]), 0, 99, 0);
    M.door(0, 0.5, 1.5, 2.3);
    for (const dx of [-5.2, -2.6, 2.6, 5.2]) M.window(dx, 2.15, 1.1, 1.5, shut, true);
    for (const dx of [-5.2, -2.6, 0, 2.6, 5.2]) M.window(dx, gy + 1.2, 1, 2, shut);
    M.lantern(-3.9, gy - 0.75, -gd + 0.35).lantern(3.9, gy - 0.75, -gd + 0.35);
    // the sign, creaking on its iron
    M.iron().beam([hw, gy + 1.95, -1.2], [hw + 1.6, gy + 1.95, -1.2], 0.035);
    G.sway = 0.1;
    M.wood(C.DARK).slab(hw + 0.4, hw + 1.5, gy + 0.85, gy + 1.8, -1.24, -1.16);
    M.iron(GOLD);
    G.push(hw + 0.95, gy + 1.32, -1.2, 0, 0, 0, 0.3, 0.3, 0.07).sphere(1, 8, 5).pop();
    G.sway = 0;
    // tables in the shade of the gallery, barrels by the door
    M.bench(-4.3, -0.1, -1.25, 0, true).bench(-4.3, -0.1, -2.05, 0).bench(4.3, -0.1, -1.25, 0, true).bench(4.3, -0.1, -2.05, 0);
    M.barrel(1.5, -0.1, -0.6).barrel(2.3, -0.1, -0.5, 0.9).barrel(-6.4, -0.1, -3.4);
    G.pop();
    for (const side of [1, 2, 3]) {
        const half = M.face(side, hw, hd);
        for (let f = 0; f < 2; f++) for (let dx = -half + 1.7; dx < half - 1; dx += 2.7) M.window(dx, 0.5 + f * FH + 1.65, 0.95, 1.4, shut);
        G.pop();
    }
    G.pop();
    for (const [dx, dz, a] of [[-4.6, -2.7, PI], [-3.6, -2.75, PI], [4, -2.7, PI], [1.2, -1.6, 0.8], [-6.2, -1.3, -1.2]]) S.idler(x + dx, y, z - hd + dz, a);
}

/** The customs house: an arcade on the quay, a terrace over it and a clock turret on the roof. Front toward -Z. */
export function customsHouse(S: Site, x: number, y: number, z: number) {
    const { M, G } = S,
        hw = 8.5,
        hd = 6.2,
        FH = 3.4,
        H = 0.5 + 2 * FH,
        wall = PLASTERS[1],
        shut = SHUTTERS[3],
        ad = 2.8,
        gy = 0.5 + FH;
    G.push(x, y, z);
    M.floor = y;
    M.stone().slab(-hw - 0.15, hw + 0.15, -2.5, 0.5, -hd - 0.15, hd + 0.15, 0.04);
    M.plaster(wall).slab(-hw, hw, 0.5, H, -hd, hd, 0.03);
    M.stone(C.PALE).slab(-hw - 0.07, hw + 0.07, gy - 0.08, gy + 0.1, -hd - 0.07, hd + 0.07).slab(-hw - 0.18, hw + 0.18, H - 0.3, H, -hd - 0.18, hd + 0.18, 0.03);
    const top = M.roof(hw, hd, H, { hip: true, pitch: 0.5, over: 0.5, tile: TILES[0] });
    S.T.smokes.push(M.chimney(-5.6, 1, H - 0.2, H + 3, wall));
    M.chimney(5.6, 1, H - 0.2, H + 3, wall);

    M.face(0, hw, hd);
    M.stone().slab(-hw - 0.2, hw + 0.2, -1.5, 0.5, -ad - 0.5, 0).slab(-hw - 0.2, hw + 0.2, -1.5, 0.25, -ad - 0.95, -ad - 0.5);
    for (let i = 0; i < 6; i++) {
        const cx = -hw + 0.45 + (i * (2 * hw - 0.9)) / 5;
        M.stone(C.PALE).slab(cx - 0.4, cx + 0.4, 0.5, 0.75, -ad - 0.4, -ad + 0.4, 0.03).slab(cx - 0.38, cx + 0.38, gy - 0.6, gy - 0.4, -ad - 0.38, -ad + 0.38, 0.03);
        M.stone(C.PALE, 0.3).post(cx, 0.75, -ad, 0.3, gy - 1.35, 9, 0.25);
    }
    M.stone(C.PALE).slab(-hw, hw, gy - 0.4, gy, -ad - 0.36, 0);
    M.rail([-hw + 0.12, gy, -ad - 0.2], [hw - 0.12, gy, -ad - 0.2], 0.9, 0.5, 0.06).rail([-hw + 0.12, gy, 0], [-hw + 0.12, gy, -ad - 0.2], 0.9, 0.5, 0.06).rail([hw - 0.12, gy, 0], [hw - 0.12, gy, -ad - 0.2], 0.9, 0.5, 0.06);
    M.door(0, 0.5, 1.6, 2.5);
    for (const dx of [-6, -3, 3, 6]) M.window(dx, 2.25, 1.1, 1.7, shut);
    for (const dx of [-6, -3, 0, 3, 6]) M.window(dx, gy + 1.3, 1.05, 2.1, shut);
    M.lantern(-3, gy - 1.1, -ad + 0.4).lantern(3, gy - 1.1, -ad + 0.4);
    // the colours, from a staff over the door
    M.wood(C.PALE, 0.6).beam([0, gy + 2.6, -0.1], [0, gy + 4.4, -3.6], 0.06, 0.04);
    M.flag(0.05, gy + 3.5, -3.5, 2.8, 1.7, RED, GOLD);
    G.pop();
    for (const side of [1, 2, 3]) {
        const half = M.face(side, hw, hd);
        for (let f = 0; f < 2; f++) for (let dx = -half + 1.6; dx < half - 1; dx += 2.9) M.window(dx, 0.5 + f * FH + 1.8, 1, 1.6, shut);
        G.pop();
    }
    // the clock turret
    M.plaster(wall).slab(-1.5, 1.5, H + 1, top + 3, -1.5, 1.5, 0.03);
    M.stone(C.PALE).slab(-1.7, 1.7, top + 3, top + 3.2, -1.7, 1.7, 0.03);
    const tip = M.roof(1.7, 1.7, top + 3.2, { hip: true, pitch: 1.25, over: 0.2, tile: TILES[1] });
    M.iron(BRASS).post(0, tip - 0.1, 0, 0.04, 1.4, 4);
    G.push(0, tip + 1.3, 0).sphere(0.16, 6, 4).pop();
    for (const s of [-1, 1]) {
        M.paint([0.94, 0.92, 0.84], 0.5).beam([0, top + 1.7, s * 1.5], [0, top + 1.7, s * 1.58], 1, 1, 16);
        M.iron().slab(-0.04, 0.04, top + 1.7, top + 2.45, s * 1.58, s * 1.62).slab(0, 0.5, top + 1.66, top + 1.74, s * 1.58, s * 1.62);
    }
    G.pop();
    for (const [dx, dz, a] of [[-1.4, -1.4, 0.6], [5, -1.5, PI], [-5.4, -4.6, 2.5]]) S.idler(x + dx, y + (dz > -ad ? 0.5 : 0), z - hd + dz, a);
}

/** The church: a tall nave end-on to the sea, buttressed, with a bell tower and spire at its shoulder. Front toward -Z. */
export function church(S: Site, x: number, y: number, z: number) {
    const { M, G } = S,
        hw = 6.2,
        hd = 11,
        HN = 9.6,
        wall = PLASTERS[1];
    G.push(x, y, z);
    M.floor = y;
    M.stone().slab(-hw - 0.25, hw + 0.25, -2.5, 0.9, -hd - 0.25, hd + 0.25, 0.05);
    M.plaster(wall).slab(-hw, hw, 0.9, HN, -hd, hd, 0.03);
    M.stone(C.PALE).slab(-hw - 0.16, hw + 0.16, HN - 0.26, HN, -hd - 0.16, hd + 0.16, 0.03);
    const top = M.roof(hw, hd, HN, { along: true, wall, pitch: 0.8, over: 0.4, tile: TILES[0] });
    M.iron(BRASS).slab(-0.06, 0.06, top - 0.2, top + 1.7, -hd - 0.3, -hd - 0.18).slab(-0.5, 0.5, top + 0.95, top + 1.07, -hd - 0.3, -hd - 0.18);
    // buttresses and tall lancets down each side
    for (const side of [1, 3]) {
        M.face(side, hw, hd);
        for (let i = 0; i <= 4; i++) {
            const bx = -hd + i * 5.5;
            if (side === 3 && i === 4) continue;
            M.stone().slab(bx - 0.45, bx + 0.45, -1, 6.4, -1.1, 0, 0.04).slab(bx - 0.45, bx + 0.45, 6.4, 7.4, -0.6, 0, 0.04);
            if (i === 4) break;
            const wx = bx + 2.75,
                lit = M.R() < 0.75;
            M.stone(C.PALE).slab(wx - 0.72, wx + 0.72, 2.9, 7, -0.06, 0.02).beam([wx, 7, 0.02], [wx, 7, -0.06], 0.72, 0.72, 12);
            if (lit) M.glow([1, 0.78, 0.46], 0.4);
            else M.paint(C.GLASS, 0.1);
            M.slab(wx - 0.5, wx + 0.5, 3.1, 7, -0.09, 0).beam([wx, 7, 0], [wx, 7, -0.09], 0.5, 0.5, 12);
            M.iron().slab(wx - 0.03, wx + 0.03, 3.1, 7.45, -0.11, -0.08).slab(wx - 0.5, wx + 0.5, 5.2, 5.26, -0.11, -0.08);
        }
        G.pop();
    }
    M.face(0, hw, hd);
    M.stone(C.PALE);
    for (let i = 0; i < 4; i++) M.slab(-2.6, 2.6, -1, 0.9 - i * 0.225, -0.6 - (i + 1) * 0.42, 0);
    M.slab(-1.55, 1.55, 0.9, 4.4, -0.12, 0.02).beam([0, 4.4, 0.02], [0, 4.4, -0.12], 1.55, 1.55, 14);
    M.wood(C.DARK).slab(-1.15, 1.15, 0.9, 4.4, -0.18, 0).beam([0, 4.4, 0], [0, 4.4, -0.18], 1.15, 1.15, 14);
    M.iron().slab(-0.03, 0.03, 0.9, 5.5, -0.2, -0.17);
    // the rose window
    M.stone(C.PALE).beam([0, 8.7, 0.02], [0, 8.7, -0.1], 1.5, 1.5, 16);
    M.glow([1, 0.8, 0.5], 0.45).beam([0, 8.7, -0.1], [0, 8.7, -0.14], 1.2, 1.2, 16);
    M.iron();
    for (let k = 0; k < 4; k++) G.push(0, 8.7, -0.15, 0, 0, (k * PI) / 4).box(1.2, 0.03, 0.02, 0).pop();
    M.lantern(-2.3, 3.3, -0.35).lantern(2.3, 3.3, -0.35);
    G.pop();
    // the apse: five sides closing the east end
    const apse = [[-3.6, hd], [-3.6, hd + 2], [-1.8, hd + 4.2], [1.8, hd + 4.2], [3.6, hd + 2], [3.6, hd]];
    M.plaster(wall).prism(apse, apse, -1, 7, false);
    M.tile(TILES[0]).prism(apse.map((p) => [p[0] * 1.08, hd + (p[1] - hd) * 1.08]), apse.map(() => [0, hd]), 6.9, 9.8, false);

    // the tower at the nave's shoulder
    G.push(-hw - 2.4, 0, -hd + 2.6);
    M.stone().slab(-3, 3, -2.5, 1.2, -3, 3, 0.05);
    M.plaster(wall).slab(-2.8, 2.8, 1.2, 17, -2.8, 2.8, 0.03);
    M.stone(C.PALE);
    for (const cy of [6.6, 12, 17]) M.slab(-2.92, 2.92, cy - 0.12, cy + 0.12, -2.92, 2.92);
    for (const side of [0, 2, 3]) {
        M.face(side, 2.8, 2.8);
        M.window(0, 4.2, 0.7, 1.4, null).window(0, 9.6, 0.7, 1.4, null).window(0, 14.6, 0.8, 1.6, SHUTTERS[1], false);
        G.pop();
    }
    // the belfry: four piers under a heavy head, the bell hanging between them
    M.plaster(wall);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) M.slab(sx * 1.85, sx * 2.8, 17.12, 20.2, sz * 1.85, sz * 2.8);
    M.slab(-2.8, 2.8, 20.2, 21, -2.8, 2.8);
    M.stone(C.PALE).slab(-3.05, 3.05, 21, 21.25, -3.05, 3.05, 0.04);
    M.wood(C.DARK).beam([-1.9, 19.9, 0], [1.9, 19.9, 0], 0.1);
    M.iron([0.5, 0.4, 0.17]);
    G.push(0, 18.3, 0).lathe([[0.8, 0, 1, 0], [0.62, 0.5, 1, 0.3], [0.36, 1.15, 1, 0.5], [0.2, 1.4, 0.5, 1], [0, 1.5, 0, 1]], 10).pop();
    const tip = M.roof(2.95, 2.95, 21.25, { hip: true, pitch: 2.1, over: 0.2, tile: TILES[1] });
    M.iron(BRASS).slab(-0.07, 0.07, tip - 0.3, tip + 2, -0.07, 0.07).slab(-0.62, 0.62, tip + 1.1, tip + 1.24, -0.07, 0.07);
    const lamp = M.world(0, 18.9, 0);
    M.lights.push({ x: lamp[0], y: lamp[1], z: lamp[2], r: 8, g: 5, b: 2.2, rad: 22, glow: 1.6 });
    G.pop();
    G.pop();
    for (const [dx, dz, a] of [[-1.5, -hd - 3.4, 0.4], [-0.6, -hd - 3.9, -2.6], [2.4, -hd - 3, 2.9]]) S.idler(x + dx, y, z + dz, a);
}

/** The governor's mansion: a long two-storeyed house under a hipped roof, a columned portico, a pavilion at either end. Front toward -Z. */
export function mansion(S: Site, x: number, y: number, z: number) {
    const { M, G, T } = S,
        hw = 13,
        hd = 6,
        FH = 3.7,
        F0 = 0.9,
        H = F0 + 2 * FH,
        wall: Rgb = [0.95, 0.92, 0.85],
        shut = SHUTTERS[2],
        pd = 3.4;
    G.push(x, y, z);
    M.floor = y;
    M.stone(C.PALE).slab(-hw - 0.3, hw + 0.3, -2.5, F0, -hd - 0.3, hd + 0.3, 0.05);
    M.plaster(wall).slab(-hw, hw, F0, H, -hd, hd, 0.03);
    M.stone(C.PALE).slab(-hw - 0.08, hw + 0.08, F0 + FH - 0.1, F0 + FH + 0.1, -hd - 0.08, hd + 0.08).slab(-hw - 0.3, hw + 0.3, H - 0.36, H, -hd - 0.3, hd + 0.3, 0.04);
    const top = M.roof(hw, hd, H, { hip: true, pitch: 0.5, over: 0.6, tile: TILES[0] });
    for (const dx of [-5, 5]) T.smokes.push(M.chimney(dx, 0.4, H - 0.2, top + 1.2, wall));
    for (const dx of [-10.6, 10.6]) M.chimney(dx, 0, H - 0.2, H + 2.7, wall);
    // a pavilion at either end
    for (const s of [-1, 1]) {
        G.push(s * (hw + 4.5), 0, 1.2);
        M.stone(C.PALE).slab(-4.8, 4.8, -2.5, F0, -4.8, 4.8, 0.05);
        M.plaster(wall).slab(-4.6, 4.6, F0, 5.7, -4.6, 4.6, 0.03);
        M.stone(C.PALE).slab(-4.8, 4.8, 5.4, 5.7, -4.8, 4.8, 0.04);
        M.roof(4.6, 4.6, 5.7, { hip: true, pitch: 0.55, over: 0.5, tile: TILES[0] });
        for (const side of [0, s > 0 ? 1 : 3, 2]) {
            M.face(side, 4.6, 4.6);
            for (const dx of [-2.1, 2.1]) M.window(dx, F0 + 2.2, 1.1, 2.3, shut);
            G.pop();
        }
        G.pop();
    }

    M.face(0, hw, hd);
    for (const dx of [-10.6, -7.6, 7.6, 10.6, -3.3, 3.3]) M.window(dx, F0 + 1.95, 1.15, 2.3, shut, Math.abs(dx) < 4 || undefined).window(dx, F0 + FH + 1.8, 1.15, 2.2, shut);
    M.window(0, F0 + FH + 1.8, 1.25, 2.4, shut, true);
    M.door(0, F0, 1.9, 3);
    M.lantern(-1.7, F0 + 2.6, -0.3).lantern(1.7, F0 + 2.6, -0.3);
    // the portico: steps, six columns, and a pediment over them
    M.stone(C.PALE).slab(-5.9, 5.9, -1.5, F0, -pd - 0.6, 0);
    for (let i = 0; i < 4; i++) M.slab(-4.4, 4.4, -1.5, F0 - (i + 1) * 0.2, -pd - 0.6 - (i + 1) * 0.42, -pd - 0.6);
    for (let i = 0; i < 6; i++) {
        const cx = -5.2 + i * 2.08;
        M.stone(C.PALE).slab(cx - 0.46, cx + 0.46, F0, F0 + 0.28, -pd - 0.46, -pd + 0.46, 0.03).slab(cx - 0.44, cx + 0.44, H - 0.82, H - 0.56, -pd - 0.44, -pd + 0.44, 0.03);
        M.stone(C.PALE, 0.36).post(cx, F0 + 0.28, -pd, 0.36, H - F0 - 1.1, 10, 0.3);
    }
    M.stone(C.PALE).slab(-5.8, 5.8, H - 0.56, H + 0.12, -pd - 0.5, 0);
    G.push(0, 0, (-pd - 0.5) / 2);
    M.roof(5.8, (pd + 0.5) / 2, H + 0.12, { along: true, wall, pitch: 0.4, over: 0.32, tile: TILES[0] });
    G.pop();
    G.pop();
    for (const side of [1, 2, 3]) {
        const half = M.face(side, hw, hd);
        if (side === 2) for (let f = 0; f < 2; f++) for (let dx = -half + 2.4; dx < half - 1; dx += 3.05) M.window(dx, F0 + f * FH + 1.9, 1.15, 2.2, shut);
        G.pop();
    }
    G.pop();
}

/** The fort on its rock: battered walls, guns in the embrasures, sentry boxes on the corners, the flag over the keep. */
/**
 * `f` is where it stands in the site's frame; `colours` are its flag's. An `outpost` is the same
 * fort away from the home town: it has no causeway and nobody walks out to it.
 */
export function fort(S: Site, f: { x: number; z: number; y: number } = P.fort, colours: [Rgb, Rgb] = [RED, GOLD], outpost = false) {
    const { M, G } = S,
        WY = 10.5,
        B = [[0, -19], [16, -8], [14, 13], [-14, 13], [-16, -8]],
        scale = (k: number) => B.map((p) => [p[0] * k, p[1] * k]),
        Tp = scale(0.9);
    G.push(f.x, 0, f.z);
    M.floor = null;
    M.stone().prism(B, Tp, -2.5, WY);
    M.stone(C.PALE).prism(scale(0.928), scale(0.925), 8.5, 8.9, false);
    M.floor = WY;
    // battlements, and guns run out between them
    const In = Tp.map((p) => {
        const l = Math.hypot(p[0], p[1]);
        return [p[0] * (1 - 0.45 / l), p[1] * (1 - 0.45 / l)];
    });
    for (let i = 0; i < 5; i++) M.stone().battlement(In[i], In[(i + 1) % 5], WY, 0.8, 1.6);
    for (const e of [4, 0, 1, 3]) {
        const a = Tp[e],
            b = Tp[(e + 1) % 5];
        let nx = b[1] - a[1],
            nz = -(b[0] - a[0]);
        const l = Math.hypot(nx, nz) * (nx * (a[0] + b[0]) + nz * (a[1] + b[1]) < 0 ? -1 : 1);
        nx /= l;
        nz /= l;
        for (const t of e === 1 || e === 3 ? [0.28, 0.6] : [0.25, 0.5, 0.75]) {
            const px = a[0] + (b[0] - a[0]) * t - nx * 2.5,
                pz = a[1] + (b[1] - a[1]) * t - nz * 2.5;
            M.cannon(px, WY, pz, Math.atan2(-nx, -nz), 1.15);
            M.shot(px - nz * 1.1 - nx * 0.4, WY, pz + nx * 1.1 - nz * 0.4);
            if (t === 0.5) S.idler(f.x + px - nz * 1.3 - nx * 1.4, WY, f.z + pz + nx * 1.3 - nz * 1.4, Math.atan2(-nx, -nz));
        }
    }
    // sentry boxes corbelled out over the seaward corners
    for (const c of [0, 1, 4]) {
        G.push(Tp[c][0] * 1.03, WY - 1.7, Tp[c][1] * 1.03, c * 0.7);
        M.stone(C.PALE, 1.2);
        G.lathe([[0.25, 0, 1, -0.7], [1.2, 1.7, 1, -0.4], [1.2, 4.7, 1, 0], [1.4, 4.7, 0, -1], [1.4, 4.92, 1, 0], [0.95, 5.6, 0.6, 0.8], [0.22, 6.2, 0.4, 1], [0, 6.6, 0, 1]], 10);
        M.paint(C.GLASS, 0.4);
        for (const a of [0, PI / 2]) G.push(0, 3.5, 0, a).box(0.09, 0.42, 1.22, 0).pop();
        G.pop();
    }
    // the barracks across the back of the platform
    const bw = PLASTERS[6];
    G.push(2, WY, 6.6);
    M.stone(C.DARKSTONE).slab(-8, 8, 0, 0.4, -3.6, 3.6);
    M.plaster(bw).slab(-7.8, 7.8, 0.4, 4.4, -3.4, 3.4, 0.03);
    const top = M.roof(7.8, 3.4, 4.4, { pitch: 0.55, wall: bw, tile: TILES[1] });
    S.T.smokes.push(M.chimney(4.6, 0.8, 4.2, top + 0.8, bw));
    for (const side of [0, 2]) {
        M.face(side, 7.8, 3.4);
        if (side === 0) M.door(0, 0.4, 1.2, 2.1);
        for (const dx of [-5.4, -2.7, 2.7, 5.4]) M.window(dx, 2.55, 0.9, 1.2, SHUTTERS[1]);
        G.pop();
    }
    G.pop();
    // the flag tower
    G.push(-8.9, WY, 7.4);
    M.stone().slab(-2.6, 2.6, 0, 9.5, -2.6, 2.6, 0.04);
    M.stone(C.PALE).slab(-2.75, 2.75, 9.1, 9.5, -2.75, 2.75, 0.03);
    M.stone();
    const q = [[-2.4, -2.4], [2.4, -2.4], [2.4, 2.4], [-2.4, 2.4]];
    for (let i = 0; i < 4; i++) M.battlement(q[i], q[(i + 1) % 4], 9.5, 0.6, 1.3);
    for (const side of [0, 1, 3]) {
        M.face(side, 2.6, 2.6);
        M.window(0, 3.4, 0.6, 1.1, null).window(0, 6.9, 0.6, 1.1, null);
        G.pop();
    }
    M.wood(C.PALE, 0.6).post(0, 9.5, 0, 0.12, 9, 6, 0.05);
    M.iron(BRASS);
    G.push(0, 18.6, 0).sphere(0.17, 6, 4).pop();
    M.flag(0.1, 16.6, 0, 5.4, 3.2, colours[0], colours[1]);
    G.pop();
    // the gatehouse on the landward wall, and the causeway to the town
    M.floor = f.y;
    M.stone().slab(1, 7, -1, 12.2, 11.2, 15.6, 0.05);
    for (const [a, b] of [[[1.3, 15.3], [6.7, 15.3]], [[1.3, 11.6], [1.3, 15.3]], [[6.7, 11.6], [6.7, 15.3]]]) M.battlement(a, b, 12.2, 0.6, 1.3);
    M.stone(C.PALE).slab(2.3, 5.7, f.y - 0.2, f.y + 3.5, 15.5, 15.68).beam([4, f.y + 3.5, 15.5], [4, f.y + 3.5, 15.68], 1.7, 1.7, 14);
    M.wood(C.DARK).slab(2.6, 5.4, f.y - 0.2, f.y + 3.5, 15.6, 15.74).beam([4, f.y + 3.5, 15.6], [4, f.y + 3.5, 15.74], 1.4, 1.4, 14);
    M.iron().slab(3.97, 4.03, f.y, f.y + 4.9, 15.74, 15.77);
    M.lantern(1.9, f.y + 3.4, 15.95).lantern(6.1, f.y + 3.4, 15.95);
    if (!outpost) M.stone(C.DARKSTONE).prism([[2.2, 15.6], [5.8, 15.6], [26, 21], [23, 26]], [[2.5, 15.6], [5.5, 15.6], [25, 21.6], [23.2, 25]], -3, f.y - 0.25);
    G.pop();
    if (outpost) return;
    // sentries pacing the wall walk, and a watch on the causeway
    S.walk(3, scale(0.62).map((p) => [f.x + p[0], WY, f.z + p[1] * 0.9 - 2.4]), true);
    S.walk(2, [[f.x + 3.4, f.y - 0.25, f.z + 17], [f.x + 23.6, f.y - 0.25, f.z + 22.6], [P.left + 6, P.quayY - 0.1, 17.5], [f.x + 24.2, f.y - 0.25, f.z + 24.2], [f.x + 4.6, f.y - 0.25, f.z + 17]], true);
    S.idler(f.x + 2.2, f.y, f.z + 16.6, PI);
    S.idler(f.x + 5.8, f.y, f.z + 16.6, PI);
}

/** The breakwater, and the lighthouse on its round head. */
export function lighthouse(S: Site) {
    const { M, G, T } = S,
        mx = P.mole.x,
        len = P.mole.len,
        top = P.quayY,
        WH: Rgb = [0.92, 0.9, 0.84];
    M.floor = null;
    M.stone().prism([[mx - 4.6, -0.6], [mx + 4.6, -0.6], [mx + 4.6, -len], [mx - 4.6, -len]], [[mx - 3.4, -0.6], [mx + 3.4, -0.6], [mx + 3.4, -len], [mx - 3.4, -len]], -4.5, top);
    M.floor = top;
    M.stone().slab(mx + 2.75, mx + 3.4, top, top + 1.05, -len, -0.6);
    M.stone(C.PALE).slab(mx + 2.68, mx + 3.47, top + 1.05, top + 1.18, -len, -0.6, 0.03);
    for (let z = -6; z > -len + 4; z -= 9) M.bollard(mx - 2.9, top, z);
    M.lampPost(mx + 2.3, top, -21, 3.6, -0.5).lampPost(mx + 2.3, top, -45, 3.6, -0.5);
    M.cannon(mx + 1.2, top, -31, -PI / 2).cannon(mx + 1.2, top, -36, -PI / 2).shot(mx + 0.2, top, -33.5);
    M.cargo(mx - 1.4, top, -12, 4, 1.1);
    for (let z = -4; z > -len; z -= 6) S.solid(mx, z, 4.8);
    S.solid(mx, -len - 2, 9);
    // the round head
    M.floor = null;
    G.push(mx, -4.5, -len - 2, 1.35 * PI);
    M.stone(C.STONE, 7.6);
    G.lathe([[8.7, 0, 1, 0.12], [7.6, 4.5 + top, 1, 0.12], [7.6, 4.5 + top, 0, 1], [0, 4.5 + top, 0, 1]], 24);
    const py = 4.5 + top;
    G.lathe([[7.6, py, 1, 0], [7.6, py + 0.95, 1, 0], [7.6, py + 0.95, 0, 1], [6.95, py + 0.95, 0, 1], [6.95, py + 0.95, -1, 0], [6.95, py, -1, 0]], 24, TAU * 0.85);
    G.pop();

    G.push(mx, top, -len - 2);
    M.floor = top;
    M.stone().prism(M.ngon(0, 0, 3.9, 8, PI / 8), M.ngon(0, 0, 3.5, 8, PI / 8), 0, 1.9);
    for (let i = 0; i < 3; i++) {
        const ya = 1.9 + i * 4.5,
            ra = 3 - 0.3 * i,
            rb = ra - 0.3;
        M.plaster(i === 1 ? [0.7, 0.17, 0.13] : WH, (ra + rb) / 2);
        G.lathe([[ra, ya, 1, 0.07], [rb, ya + 4.5, 1, 0.07]], 16);
    }
    // the gallery and its rail
    M.stone(C.PALE, 2.6);
    G.lathe([[2.1, 14.9, 1, -0.6], [3.25, 15.4, 1, -0.3], [3.25, 15.7, 1, 0], [3.25, 15.7, 0, 1], [0, 15.7, 0, 1]], 16);
    M.iron();
    for (let k = 0; k < 14; k++) M.post(Math.cos((k / 14) * TAU) * 3.08, 15.7, Math.sin((k / 14) * TAU) * 3.08, 0.035, 1, 4);
    G.lathe([[3.08, 16.65, 0, -1], [3.13, 16.7, 1, 0], [3.08, 16.75, 0, 1], [3.03, 16.7, -1, 0], [3.08, 16.65, 0, -1]], 16);
    // the lantern under its copper dome
    M.plaster(WH, 1.75);
    G.lathe([[1.75, 15.7, 1, 0], [1.75, 16.35, 1, 0], [1.75, 16.35, 0, 1], [1.5, 16.35, 0, 1]], 12);
    M.glow([1, 0.86, 0.55], 0.9);
    G.push(0, 16.35, 0).cyl(1.5, 2.3, 12, 0.02).pop();
    M.iron();
    for (let k = 0; k < 8; k++) M.post(Math.cos((k / 8) * TAU) * 1.55, 16.35, Math.sin((k / 8) * TAU) * 1.55, 0.045, 2.3, 4);
    M.iron([0.3, 0.46, 0.4]);
    G.push(0, 18.65, 0).lathe([[1.85, 0, 1, 0], [1.8, 0.14, 1, 0.3], [1.35, 0.95, 0.7, 0.7], [0.62, 1.45, 0.35, 0.9], [0.12, 1.6, 0.3, 1], [0.08, 2.4, 1, 0], [0, 2.45, 0, 1]], 12).pop();
    G.push(0, 21.15, 0).sphere(0.2, 6, 4).pop();
    // the door toward the mole, steps down from it, and windows up the stair
    G.push(0, 1.9, 2.94, PI);
    M.door(0, 0, 1, 2.1);
    G.pop();
    M.stone(C.PALE);
    for (let i = 0; i < 5; i++) M.slab(-1.1, 1.1, 0, 1.9 - (i + 1) * 0.32, 3.4 + i * 0.42, 3.4 + (i + 1) * 0.42);
    for (const [wy, a] of [[5.2, 0], [8.6, PI * 0.6], [12, -PI * 0.5]]) {
        G.push(0, wy, 0, a).push(0, 0, -(3 - (0.9 * (wy - 1.9)) / 13.5) + 0.04);
        M.window(0, 0, 0.6, 1, null);
        G.pop().pop();
    }
    T.beam = M.world(0, 17.5, 0);
    M.lights.push({ x: T.beam[0], y: T.beam[1], z: T.beam[2], r: 30, g: 23, b: 11, rad: 150, glow: 5 });
    G.pop();
    const ring: number[][] = [];
    for (let k = 0; k < 7; k++) ring.push([mx + Math.sin(-2.1 + k * 0.7) * 5.5, top, -len - 2 + Math.cos(-2.1 + k * 0.7) * 5.5]);
    S.walk(2, [[mx - 1.3, top, 3], [mx - 1.3, top, -len + 3], ...ring, [mx + 1.1, top, -len + 3], [mx + 1.1, top, 3]]);
    S.idler(mx - 2.4, top, -len - 5.6, 2.2);
    S.idler(mx + 2.1, top, -33.5, -PI / 2);
}

/** A stone tower mill on the highest ground behind the town, its sails toward the sea. */
export function windmill(S: Site) {
    const { M, G, T } = S;
    // the highest ground behind the town's right shoulder
    let bx = 60,
        bz = 130,
        by = -1;
    for (let lx = 30; lx <= 84; lx += 3)
        for (let lz = P.back + 6; lz <= 150; lz += 3) {
            const [x, z] = toWorld(lx, lz),
                h = height(x, z);
            if (h > by) {
                by = h;
                bx = lx;
                bz = lz;
            }
        }
    G.push(bx, by - 0.7, bz);
    M.floor = null;
    M.stone(C.PALE, 3);
    G.lathe([[3.6, 0, 1, 0.09], [2.6, 10.6, 1, 0.09]], 14);
    M.wood([0.36, 0.3, 0.25], 0.9);
    G.push(0, 10.6, 0).lathe([[3, -0.2, 1, 0.5], [2.9, 0.05, 1, 0.6], [1.7, 2, 0.8, 0.7], [0.25, 3.2, 0.5, 1], [0, 3.25, 0, 1]], 12).pop();
    M.wood(C.DARK).beam([0, 11.4, 0.6], [0, 11.9, -3.5], 0.22, 0.17, 6);
    G.push(0, 0.7, -3.5);
    M.door(0, 0, 1.05, 2.1);
    G.pop();
    for (const [wy, a] of [[4.6, 0.9], [7.8, -0.7], [4.6, PI]]) {
        G.push(0, wy, 0, a).push(0, 0, -(3.6 - wy * 0.094) + 0.05);
        M.window(0, 0, 0.7, 1, null);
        G.pop().pop();
    }
    const hub = M.world(0, 11.9, -3.55);
    T.mill = { x: hub[0], y: hub[1], z: hub[2], yaw: HB.yaw };
    M.cargo(3.4, 0.6, -3.6, 3, 0.9);
    G.pop();
}
