// Per-type enemy stats. type: 0 skitter, 1 lancer, 2 bulwark, 3 colossus.
// hs = hit spheres in local space: [x, y, z, radius, bossNodeIndex?]
export const TY = [
    { hp: 70, r: 0.5, sp: 6.4, mass: 1, br: 1, hs: [[0, 0.42, 0, 0.56]] },
    { hp: 115, r: 0.7, sp: 5.2, mass: 1.3, br: 1.2, hs: [[0, 0, 0, 0.74]] },
    { hp: 800, r: 1.0, sp: 2.4, mass: 6, br: 2.2, hs: [[0, 1.95, 0, 0.95], [0, 0.8, 0, 0.72]] },
    { hp: 3400, r: 3, sp: 1.9, mass: 60, br: 6.5, hs: [[0, 6.4, 0, 2.6], [0, 2.6, 0, 1.9], [-3.25, 7.7, 0, 1.35, 0], [3.25, 7.7, 0, 1.35, 1], [0, 6.0, -2.8, 1.35, 2], [0, 10.5, 0.1, 1.35, 3]] },
];
/** Colossus frost-node positions in local space. */
export const NODEP = [[-3.25, 7.7, 0], [3.25, 7.7, 0], [0, 6.0, -2.8], [0, 10.5, 0.1]];
/** Colossus scale. */
export const BS = 1.3;
