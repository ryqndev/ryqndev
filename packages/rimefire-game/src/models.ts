import { m4, m4aim, PI, rng, TAU } from '@ryqndev/rimefire-math';
import { Geo, type Mesh, registerMesh } from '@ryqndev/rimefire-renderer';

export type ModelName =
    | 'skBody' | 'skLeg' | 'lnCore' | 'lnSpike' | 'bwTorso' | 'bwArm' | 'bwLeg'
    | 'bsTorso' | 'bsNode' | 'bsArm' | 'bsLeg' | 'pyCoil' | 'pyIce' | 'heartIce'
    | 'shard' | 'boulder' | 'debA' | 'debB'
    | 'gunGel' | 'gelTank' | 'gunSpark' | 'sparkCoil' | 'flame' | 'mzFlash';

/** Every instanced mesh in the game, built procedurally by buildModels(). */
export const M = {} as Record<ModelName, Mesh>;
const ICE = [0.5, 0.8, 1],
    DARK = [0.13, 0.14, 0.16],
    STEEL = [0.34, 0.36, 0.4];

export function buildModels() {
    const R = rng(4242);
    const rr = (a: number, b: number) => a + R() * (b - a);
    const geo = () => new Geo();
    const ice = (g: Geo, e = 0.12) => g.mat(0.15, 0, e, 3).col(ICE[0], ICE[1], ICE[2]);
    const dark = (g: Geo, rough = 0.45) => g.mat(rough, 0.85, 0, 2).col(DARK[0], DARK[1], DARK[2]);
    const steel = (g: Geo) => g.mat(0.32, 0.9, 0, 2).col(STEEL[0], STEEL[1], STEEL[2]);
    const glow = (g: Geo, r: number, gg: number, b: number, e: number) => g.mat(0.3, 0, e, 4).col(r, gg, b);
    let g: Geo;

    // ---------------- skitter ----------------
    g = geo();
    dark(g).box(0.2, 0.11, 0.36, 0.04);
    g.push(0, 0.02, -0.44).box(0.15, 0.09, 0.13, 0.03).pop();
    glow(g, 0.3, 0.9, 1, 0.3);
    for (const s of [-1, 1]) g.push(s * 0.085, 0.05, -0.575).box(0.035, 0.022, 0.012, 0.004).pop();
    ice(g, 0.25);
    for (const s of [-1, 1]) g.push(s * 0.1, -0.04, -0.52, 0, -PI / 2 + 0.15, s * 0.25).crystal(0.035, 0.3, 0.14, 4, 0.6).pop();
    for (let i = 0; i < 5; i++) g.push(rr(-0.12, 0.12), 0.08, rr(-0.25, 0.3), 0, rr(0.3, 0.9), rr(-0.4, 0.4)).crystal(rr(0.07, 0.14), rr(0.3, 0.62), 0.2, 5, 0.6, 0, R).pop();
    M.skBody = registerMesh(g);
    g = geo();
    dark(g).sphere(0.06, 8, 5);
    ice(g, 0.18).push(0, 0, 0, 0, 0, PI).crystal(0.05, 0.42, 0.14, 5, 0.6).pop();
    M.skLeg = registerMesh(g);

    // ---------------- lancer ----------------
    g = geo();
    glow(g, 0.3, 0.85, 1, 0.34).sphere(0.2, 12, 8);
    dark(g).lathe([[0.3, -0.05, -1, 0], [0.4, -0.05, 0, -1], [0.44, 0, 1, 0], [0.4, 0.05, 0, 1], [0.3, 0.05, -1, 0], [0.3, -0.05, -1, 0]], 16);
    ice(g, 0.22).push(0, 0.16, 0).crystal(0.2, 0.62, 0.3, 6, 0.55).pop();
    g.push(0, -0.16, 0, 0, 0, PI).crystal(0.22, 0.85, 0.5, 6, 0.5).pop();
    M.lnCore = registerMesh(g);
    g = geo();
    ice(g, 0.1).crystal(0.07, 1.05, 0.55, 5, 0.8, 0.2);
    M.lnSpike = registerMesh(g);

    // ---------------- bulwark ----------------
    g = geo();
    dark(g).box(0.38, 0.2, 0.27, 0.07);
    g.push(0, 0.38, 0.02).box(0.36, 0.24, 0.26, 0.08).pop();
    g.push(0, 0.86, 0.04, 0, -0.12, 0).box(0.7, 0.36, 0.4, 0.12).pop();
    steel(g).push(0, 0.8, -0.34, 0, -0.12, 0).box(0.4, 0.26, 0.07, 0.04).pop();
    for (const s of [-1, 1]) g.push(s * 0.74, 1.02, 0.03).box(0.2, 0.17, 0.3, 0.08).pop();
    glow(g, 0.3, 0.9, 1, 0.22).push(0, 0.8, -0.415, 0, -PI / 2 - 0.12, 0).cyl(0.07, 0.02, 12, 0.005).pop();
    dark(g).push(0, 1.27, -0.08).box(0.17, 0.13, 0.17, 0.05).pop();
    glow(g, 0.3, 0.9, 1, 0.4).push(0, 1.28, -0.255).box(0.12, 0.025, 0.012, 0.004).pop();
    ice(g, 0.14);
    for (const s of [-1, 1]) {
        g.push(s * 0.72, 1.12, 0.05, 0, 0.25, -s * 0.55).crystal(0.26, 0.85, 0.35, 6, 0.7, 0, R).pop();
        g.push(s * 0.5, 1.08, 0.28, 0, 0.75, -s * 0.25).crystal(0.2, 0.7, 0.3, 5, 0.7, 0, R).pop();
        g.push(s * 0.3, 1.2, 0.1, 0, 0.3, -s * 0.2).crystal(0.12, 0.42, 0.2, 5, 0.7, 0, R).pop();
    }
    g.push(0, 0.95, 0.36, 0, 0.95, 0).crystal(0.3, 0.9, 0.4, 6, 0.7, 0, R).pop();
    g.push(0.1, 0.6, 0.3, 0, 1.3, 0.2).crystal(0.2, 0.6, 0.3, 5, 0.7, 0, R).pop();
    M.bwTorso = registerMesh(g);
    g = geo();
    dark(g).sphere(0.2, 10, 6);
    g.push(0, -0.36, 0).box(0.15, 0.3, 0.15, 0.04).pop();
    ice(g, 0.16).push(0, -0.55, 0, 0, 0, PI).crystal(0.3, 0.95, 0.4, 6, 0.6, 0, R).pop();
    M.bwArm = registerMesh(g);
    g = geo();
    dark(g).push(0, -0.5, 0).box(0.18, 0.5, 0.2, 0.05).pop();
    steel(g).push(0, -1.1, -0.07).box(0.21, 0.1, 0.3, 0.04).pop();
    ice(g, 0.1).push(0, -0.3, 0.12, 0, 0.5, 0).crystal(0.12, 0.4, 0.15, 5, 0.7).pop();
    M.bwLeg = registerMesh(g);

    // ---------------- colossus (boss) ----------------
    g = geo();
    dark(g, 0.5).lathe([[0, 0, 0, -1], [1.1, 0, 0, -1], [1.3, 0.2, 1, -0.3], [1.9, 1.7, 1, -0.2], [1.95, 2.3, 1, 0.1], [1.5, 3.0, 0.7, 0.7], [0.8, 3.2, 0.2, 1], [0, 3.2, 0, 1]], 20);
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        steel(g).push(Math.cos(a) * 1.72, 1.5, Math.sin(a) * 1.72, -a + PI / 2, 0, 0).box(0.13, 0.9, 0.12, 0.04).pop();
        glow(g, 1, 0.42, 0.1, 0.5).push(Math.cos(a + 0.31) * 1.74, 1.45, Math.sin(a + 0.31) * 1.74, -a - 0.31 + PI / 2, 0, 0).box(0.1, 0.6, 0.04, 0.01).pop();
    }
    dark(g).push(0, 3.5, 0).box(0.5, 0.4, 0.5, 0.12).pop();
    glow(g, 0.3, 0.9, 1, 0.5).push(0, 3.55, -0.51).box(0.36, 0.06, 0.02, 0.006).pop();
    ice(g, 0.07);
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.3;
        g.push(Math.cos(a) * 0.55, 3.6, Math.sin(a) * 0.55, -a, 0, -0.9).crystal(0.2, rr(0.6, 1.0), 0.4, 5, 0.7, 0, R).pop();
    }
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + 0.2;
        g.push(Math.cos(a) * 1.75, 2.7, Math.sin(a) * 1.75, -a, 0, -0.75).crystal(rr(0.3, 0.45), rr(0.9, 1.7), 0.5, 5, 0.7, 0, R).pop();
    }
    for (const sx of [-1, 1]) dark(g, 0.5).push(sx * 2.0, 2.65, 0).box(0.55, 0.4, 0.75, 0.15).pop();
    M.bsTorso = registerMesh(g);
    g = geo();
    ice(g, 0.45);
    for (let i = 0; i < 7; i++) g.push(0, 0, 0, rr(0, TAU), rr(-1.6, 1.6), rr(-1.6, 1.6)).push(0, -0.2, 0).crystal(rr(0.3, 0.5), rr(0.9, 1.35), 0.5, 5, 0.6, 0, R).pop().pop();
    M.bsNode = registerMesh(g);
    g = geo();
    dark(g, 0.5).sphere(0.6, 12, 7);
    g.push(0, -1.1, 0).box(0.42, 0.95, 0.42, 0.1).pop();
    ice(g, 0.2).push(0, -1.8, 0, 0, 0, PI).crystal(0.8, 2.5, 0.9, 6, 0.6, 0, R).pop();
    M.bsArm = registerMesh(g);
    g = geo();
    dark(g, 0.5).push(0, -1.5, 0).box(0.5, 1.5, 0.55, 0.12).pop();
    steel(g).push(0, -3.15, -0.2).box(0.62, 0.25, 0.9, 0.08).pop();
    ice(g, 0.14).push(0, -0.8, 0.4, 0, 0.6, 0).crystal(0.3, 1.1, 0.4, 5, 0.7, 0, R).pop();
    M.bsLeg = registerMesh(g);

    // ---------------- pylons / heart ----------------
    g = geo();
    for (const y of [2.5, 3.6, 4.7, 5.8])
        g.mat(0.35, 0.3, 1, 2).col(1, 0.42, 0.08).push(0, y, 0).lathe([[0.5, 0, 0, -1], [0.8, 0, 0, -1], [0.86, 0.06, 1, 0], [0.86, 0.22, 1, 0], [0.8, 0.28, 0, 1], [0.5, 0.28, 0, 1]], 16).pop();
    g.push(0, 7.75, 0).sphere(0.52, 14, 9).pop();
    dark(g);
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        g.push(Math.cos(a) * 0.58, 7.2, Math.sin(a) * 0.58).box(0.035, 0.75, 0.035, 0.01).pop();
    }
    g.push(0, 8.4, 0).cyl(0.62, 0.1, 12, 0.03).pop();
    M.pyCoil = registerMesh(g);
    g = geo();
    ice(g, 0.08);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + rr(-0.2, 0.2);
        g.push(Math.cos(a) * 1.0, -0.3, Math.sin(a) * 1.0, -a, 0, rr(0.02, 0.2)).crystal(rr(0.75, 1.1), rr(4.5, 8.6), 1.6, 6, 0.75, 0, R).pop();
    }
    for (let i = 0; i < 6; i++) {
        const a = rr(0, TAU);
        g.push(Math.cos(a) * 1.7, -0.3, Math.sin(a) * 1.7, -a, 0, rr(-0.5, -0.15)).crystal(rr(0.35, 0.6), rr(1.5, 3.2), 0.8, 5, 0.7, 0, R).pop();
    }
    M.pyIce = registerMesh(g);
    g = geo();
    ice(g, 0.14);
    g.crystal(1.9, 9, 3, 7, 0.8, 0, R);
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + rr(-0.2, 0.2);
        g.push(Math.cos(a) * 1.9, -0.2, Math.sin(a) * 1.9, -a, 0, rr(-0.45, -0.08)).crystal(rr(0.9, 1.5), rr(3.5, 7), 1.6, 6, 0.75, 0, R).pop();
    }
    M.heartIce = registerMesh(g);

    // ---------------- projectiles / debris ----------------
    g = geo();
    ice(g, 0.7).push(0, -0.45, 0).crystal(0.085, 0.95, 0.5, 5, 0.75, 0.25).pop();
    M.shard = registerMesh(g);
    g = geo();
    ice(g, 0.3).push(0, -0.35, 0).crystal(0.42, 0.75, 0.3, 6, 0.85, 0.3, R).pop();
    M.boulder = registerMesh(g);
    g = geo();
    ice(g, 0.25).push(0, -0.18, 0).crystal(0.13, 0.42, 0.16, 4, 0.6, 0.14, R).pop();
    M.debA = registerMesh(g);
    g = geo();
    dark(g).box(0.13, 0.07, 0.1, 0.02);
    M.debB = registerMesh(g);

    // ---------------- weapons (viewmodel; -Z forward) ----------------
    // gelcaster
    const paint = (g: Geo) => g.mat(0.42, 0.25, 0, 2).col(0.62, 0.65, 0.7);
    const rubber = (g: Geo) => g.mat(0.9, 0, 0, 2).col(0.13, 0.135, 0.15);
    const along = (x: number, y: number, z: number) => m4aim(m4(), x, y, z, 0, 0, -1);
    g = geo();
    rubber(g).push(0, -0.025, 0.15).box(0.05, 0.05, 0.13, 0.02).pop();
    dark(g, 0.5).push(0, -0.005, 0.02).box(0.056, 0.058, 0.02, 0.008).pop();
    paint(g).push(0, 0, -0.085).box(0.05, 0.058, 0.15, 0.014).pop();
    dark(g, 0.4).push(0, 0.064, -0.09).box(0.02, 0.01, 0.13, 0.004).pop();
    g.push(0, -0.075, -0.03).box(0.024, 0.035, 0.04, 0.01).pop();
    g.mat(0.5, 0, 0.5, 2).col(0.3, 1, 0.35).push(0.052, 0.02, -0.09).box(0.003, 0.008, 0.11, 0.002).pop();
    g.push(0.02, 0.072, -0.2).box(0.008, 0.004, 0.02, 0.002).pop();
    // barrel + flared nozzle
    g.pushM(along(0, 0, -0.22));
    steel(g).cyl(0.04, 0.2, 18, 0.006);
    paint(g).lathe([[0.028, 0.18, -1, 0], [0.04, 0.18, 0, -1], [0.05, 0.23, 1, -0.5], [0.053, 0.275, 1, 0], [0.047, 0.285, 0, 1], [0.036, 0.285, 0, 1], [0.028, 0.18, -1, 0.3]], 20);
    g.mat(0.5, 0, 0.7, 2).col(0.25, 1, 0.3).lathe([[0.042, 0.05, 0, -1], [0.0445, 0.054, 1, 0], [0.0445, 0.066, 1, 0], [0.042, 0.07, 0, 1]], 18);
    g.lathe([[0.042, 0.11, 0, -1], [0.0445, 0.114, 1, 0], [0.0445, 0.126, 1, 0], [0.042, 0.13, 0, 1]], 18);
    g.pop();
    steel(g).pushM(along(0, -0.052, -0.1)).cyl(0.015, 0.27, 10, 0.003).pop();
    // side canister cradle (the gel itself is a separate, animated mesh)
    for (const z of [0.0, -0.175]) paint(g).pushM(along(-0.086, 0.018, z)).cyl(0.042, 0.016, 18, 0.006).pop();
    dark(g, 0.4).pushM(along(-0.086, 0.018, 0.012)).cyl(0.014, 0.012, 10, 0.003).pop();
    dark(g, 0.5);
    for (const z of [-0.05, -0.13]) g.push(-0.06, 0.018, z).box(0.03, 0.05, 0.006, 0.003).pop();
    g.pushM(m4aim(m4(), -0.086, 0.018, -0.19, 0.5, -0.1, -1)).cyl(0.01, 0.1, 8, 0.002).pop();
    M.gunGel = registerMesh(g);
    g = geo();
    glow(g, 0.2, 1, 0.3, 0.13).cyl(0.038, 1, 18, 0.004);
    M.gelTank = registerMesh(g);
    // striker
    g = geo();
    rubber(g).push(0, -0.025, 0.15).box(0.047, 0.048, 0.13, 0.02).pop();
    dark(g, 0.5).push(0, -0.005, 0.02).box(0.052, 0.054, 0.02, 0.008).pop();
    paint(g).push(0, 0, -0.075).box(0.04, 0.052, 0.14, 0.012).pop();
    dark(g, 0.4).push(0, 0.058, -0.08).box(0.014, 0.01, 0.12, 0.004).pop();
    g.push(0, 0.075, 0.03).box(0.012, 0.012, 0.01, 0.003).pop();
    g.push(0, -0.07, -0.03).box(0.022, 0.035, 0.04, 0.01).pop();
    g.push(0.043, 0.0, -0.1).box(0.004, 0.03, 0.07, 0.002).pop().push(-0.043, 0.0, -0.1).box(0.004, 0.03, 0.07, 0.002).pop();
    g.mat(0.5, 0.2, 0.5, 2).col(1, 0.45, 0.1).push(0.042, 0.035, -0.08).box(0.003, 0.006, 0.1, 0.002).pop().push(-0.042, 0.035, -0.08).box(0.003, 0.006, 0.1, 0.002).pop();
    g.pushM(along(0, 0.005, -0.2));
    steel(g).cyl(0.017, 0.38, 14, 0.003);
    dark(g, 0.3).lathe([[0.017, 0.35, 0, -1], [0.026, 0.355, 1, -0.3], [0.031, 0.4, 1, 0], [0.026, 0.41, 0, 1], [0.014, 0.41, 0, 1], [0.013, 0.36, -1, 0]], 14);
    g.lathe([[0.017, 0.03, 0, -1], [0.03, 0.03, 0, -1], [0.032, 0.04, 1, 0], [0.032, 0.085, 1, 0], [0.03, 0.095, 0, 1], [0.017, 0.095, 0, 1]], 14);
    g.pop();
    steel(g).pushM(along(0, -0.04, -0.12)).cyl(0.011, 0.2, 8, 0.002).pop();
    M.gunSpark = registerMesh(g);
    g = geo();
    g.pushM(along(0, 0.005, -0.2));
    for (let i = 0; i < 6; i++)
        g.mat(0.4, 0.4, 1, 2).col(1, 0.4, 0.07).push(0, 0.125 + i * 0.036, 0).lathe([[0.016, 0, 0, -1], [0.025, 0, 0, -1], [0.028, 0.005, 1, 0], [0.028, 0.017, 1, 0], [0.025, 0.022, 0, 1], [0.016, 0.022, 0, 1]], 12).pop();
    g.pop();
    M.sparkCoil = registerMesh(g);
    // pilot flame + muzzle flash (emissive)
    g = geo();
    glow(g, 1, 0.55, 0.18, 0.6).push(0, -0.1, 0).crystal(0.35, 1, 0.75, 6, 0.5, 0.12).pop();
    M.flame = registerMesh(g);
    g = geo();
    glow(g, 1, 1, 1, 0.8);
    for (let i = 0; i < 3; i++) g.push(0, 0, 0, 0, 0, (i / 3) * PI).box(0.5, 0.045, 0.02, 0.01).pop();
    g.sphere(0.16, 8, 5);
    M.mzFlash = registerMesh(g);
}
