import { clamp, lerp, m4aim, m4mul, m4trs, PI, TAU } from '@ryqndev/kiln-math';
import { addInstance, type Mesh } from '@ryqndev/rimefire-renderer';

import { light } from '../fx';
import { M } from '../models';
import { S } from '../state';
import { BS, NODEP } from './defs';
import { hostXform } from './hit';
import { B, H, Lm, Tm } from './state';
import type { Foe } from './types';

export function drawSkitter(e: Foe) {
    const mv = clamp(Math.hypot(e.vx, e.vz) / 3, 0, 1),
        bob = Math.sin(e.anim * 2) * 0.03 * mv,
        fl = Math.max(e.flash, e.burn > 0 ? 0.3 : 0);
    const crouch = e.st === 1 ? Math.min(1, e.t / 0.3) * 0.14 : 0;
    m4trs(B, e.x, e.y + 0.42 + bob + e.rise - crouch, e.z, e.yaw, e.pitch, 0, e.sc);
    addInstance(M.skBody, B, 1, 1, 1, fl);
    for (let i = 0; i < 4; i++) {
        const side = i & 1 ? 1 : -1,
            lz = i & 2 ? 0.25 : -0.27,
            ph = e.anim + (i === 0 || i === 3 ? 0 : PI);
        const sw = Math.sin(ph) * mv,
            lift = Math.max(0, Math.cos(ph)) * mv,
            air = e.air ? 0.2 : 0;
        const hx = side * 0.19,
            hz = lz,
            fx = side * (0.58 - air),
            fy = -0.42 - bob + crouch + lift * 0.17 + air,
            fz = lz + sw * 0.21 + (e.air ? 0.2 : 0);
        const kx = (hx + fx) / 2 + side * 0.12,
            ky = 0.2 + lift * 0.06,
            kz = (hz + fz) / 2;
        let l = Math.hypot(hx - kx, -ky, hz - kz);
        m4aim(Lm, hx, 0, hz, hx - kx, -ky, hz - kz, 1, l / 0.42, 1);
        m4mul(Tm, B, Lm);
        addInstance(M.skLeg, Tm, 1, 1, 1, fl);
        l = Math.hypot(kx - fx, ky - fy, kz - fz);
        m4aim(Lm, kx, ky, kz, kx - fx, ky - fy, kz - fz, 0.8, l / 0.42, 0.8);
        m4mul(Tm, B, Lm);
        addInstance(M.skLeg, Tm, 1, 1, 1, fl);
    }
}
export function drawLancer(e: Foe, ax: number, ay: number, az: number) {
    const fl = Math.max(e.flash, e.burn > 0 ? 0.3 : 0);
    m4trs(B, e.x, e.y + e.rise, e.z, e.yaw, 0, Math.sin(S.t * 1.3 + e.seed) * 0.08, e.sc);
    addInstance(M.lnCore, B, 1, 1, 1, fl, 1 + e.charge * 4);
    const rx = Math.cos(e.yaw),
        rz = -Math.sin(e.yaw),
        l = Math.hypot(ax, ay, az) || 1;
    ax /= l;
    ay /= l;
    az /= l;
    for (let k = 0; k < 5; k++) {
        const a = S.t * (1.1 + e.charge * 7) + (k * TAU) / 5 + e.seed,
            c = Math.cos(a),
            s = Math.sin(a),
            rad = 0.66 - 0.22 * e.charge;
        const ox = rx * c * rad,
            oy = s * rad,
            oz = rz * c * rad;
        const dx = lerp(ox * 0.9, ax, e.charge),
            dy = lerp(oy * 0.9 - 0.75, ay, e.charge),
            dz = lerp(oz * 0.9, az, e.charge);
        const dl = Math.hypot(dx, dy, dz) || 1;
        m4aim(Tm, e.x + ox - (dx / dl) * 0.35, e.y + e.rise + oy - (dy / dl) * 0.35, e.z + oz - (dz / dl) * 0.35, dx, dy, dz, e.sc);
        addInstance(M.lnSpike, Tm, 1, 1, 1, fl, 1 + e.charge * 3);
    }
}
function limb(mesh: Mesh, x: number, y: number, z: number, pitch: number, roll: number, fl: number, s = 1) {
    m4trs(Lm, x, y, z, 0, pitch, roll, s);
    m4mul(Tm, B, Lm);
    addInstance(mesh, Tm, 1, 1, 1, fl);
}
export function drawBulwark(e: Foe) {
    const fl = Math.max(e.flash, e.burn > 0 ? 0.25 : 0),
        sw = Math.sin(e.anim);
    m4trs(B, e.x, e.y + 1.2 + Math.abs(Math.cos(e.anim)) * 0.05 + e.rise * 2, e.z, e.yaw, e.st === 2 ? -0.35 : 0.06, 0, e.sc);
    addInstance(M.bwTorso, B, 1, 1, 1, fl);
    const raised = e.st !== 0;
    limb(M.bwArm, -0.84, 1.0, 0, raised ? e.arm : sw * 0.45, -0.14, fl);
    limb(M.bwArm, 0.84, 1.0, 0, raised ? e.arm : -sw * 0.45, 0.14, fl);
    limb(M.bwLeg, -0.25, 0, 0, -sw * 0.5, 0, fl);
    limb(M.bwLeg, 0.25, 0, 0, sw * 0.5, 0, fl);
}
export function drawBoss(e: Foe) {
    const fl = e.flash * 0.6,
        sw = Math.sin(e.anim),
        kn = e.kneel || 0;
    const ex = e.st === 5 ? 1 : 0;
    m4trs(B, e.x, e.y + (3.4 - kn * 1.1 + Math.abs(Math.cos(e.anim)) * 0.12) * BS + e.rise, e.z, e.yaw, -kn * 0.25 + (e.st === 2 ? -0.25 : 0), 0, e.sc);
    addInstance(M.bsTorso, B, 1, 1, 1, fl, 0.5 + ex * 3 + Math.sin(S.t * 6) * 0.2 * ex + e.charge * 1.5);
    const raised = e.st === 1 || e.st === 2;
    limb(M.bsArm, -2.3, 2.5, 0, raised ? e.arm : sw * 0.3 + kn * 0.5, -0.12, fl);
    limb(M.bsArm, 2.3, 2.5, 0, raised ? e.arm * 0.3 : -sw * 0.3 + kn * 0.5, 0.12, fl);
    limb(M.bsLeg, -0.95, 0, 0, -sw * 0.4 + kn * 0.9, 0, fl);
    limb(M.bsLeg, 0.95, 0, 0, sw * 0.4 + kn * 0.9, 0, fl);
    for (let i = 0; i < 4; i++) {
        const n = e.nodes[i];
        if (n.sc < 0.03) continue;
        const pulse = 1 + Math.sin(S.t * 3 + i) * 0.06;
        hostXform(e, NODEP[i][0], NODEP[i][1], NODEP[i][2], H);
        m4trs(Tm, H.x, H.y, H.z, e.yaw + i, S.t * 0.2, 0, n.sc * pulse * BS);
        addInstance(M.bsNode, Tm, 1, 1, 1, n.fl || 0, 1.2 + Math.sin(S.t * 3 + i) * 0.4);
        light(H.x, H.y, H.z, 1.5 * n.sc, 5 * n.sc, 8 * n.sc, 8);
    }
}
