import { keys, mouse, opts } from '@ryqndev/kiln-core';
import { clamp, damp, m4, m4aim, m4mul, m4trs, PI, rnd, rnds, vnoise } from '@ryqndev/kiln-math';
import { setListener, sfx } from '@ryqndev/rimefire-audio';
import { addInstance, cam, setCamera } from '@ryqndev/rimefire-renderer';

import { aimDist, fireGel, fireSpark, GEL_AIM_RANGE, lobVelocity } from './combat';
import { flash, fxPuff, light, shake, spawn } from './fx';
import { M } from './models';
import { PL, S } from './state';
import { ARENA, groundAt, height, pushOut, STEP } from './world';

/** The wheel swaps weapons at most this often, milliseconds. */
const WHEEL_SWAP_MS = 180;
let wheelT = 0;

// scratch: viewmodel matrix, local temporaries, the muzzle position and a gel launch velocity
const VM = m4(),
    Lm = m4(),
    Tm = m4(),
    mz = { x: 0, y: 0, z: 0 },
    lob = { x: 0, y: 0, z: 0 };

export function resetPlayer() {
    Object.assign(PL, {
        x: 0, y: height(0, -50), z: -50, vx: 0, vy: 0, vz: 0, yaw: PI, pitch: 0.04, hp: 100, hurtT: 9, ground: true, coyote: 0, jbuf: 0,
        weapon: 0, next: 0, sw: 1, gel: 100, gelT: 9, dry: false, cool: 0, rof: 0, heat: 0, kick: 0, kickV: 0, mzT: 0, bob: 0, dip: 0, dipV: 0,
        swx: 0, swy: 0, low: 0, fovK: 0, step: 0, deadT: 0, fired: 0, sparked: 0, god: false, lmx: 0, lmy: 0,
    });
}

// viewmodel-local point -> where it appears in the world (the viewmodel uses its own FOV)
function vmWorld(lx: number, ly: number, lz: number, o: { x: number; y: number; z: number }) {
    const m = Lm0;
    const vx = m[0] * lx + m[4] * ly + m[8] * lz + m[12],
        vy = m[1] * lx + m[5] * ly + m[9] * lz + m[13],
        vz = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
    const k = cam.vmProj[5] / cam.proj[5],
        d = -vz;
    o.x = cam.x + (cam.rx * vx + cam.ux * vy) * k + cam.fx * d;
    o.y = cam.y + (cam.ry * vx + cam.uy * vy) * k + cam.fy * d;
    o.z = cam.z + (cam.rz * vx + cam.uz * vy) * k + cam.fz * d;
}
const Lm0 = m4();

/** Starts a weapon swap. With no argument it toggles between the two. */
export function swapWeapon(to?: number) {
    const p = PL;
    if (to === undefined) to = 1 - p.next;
    if (to === p.next) return;
    p.next = to;
    p.sw = 0;
    sfx.swap();
}

export function updatePlayer(dt: number) {
    const p = PL;
    // ---- look ----
    p.yaw -= mouse.dx * opts.sens;
    p.pitch = clamp(p.pitch - mouse.dy * opts.sens, -1.5, 1.5);
    p.lmx = damp(p.lmx, mouse.dx, 14, dt);
    p.lmy = damp(p.lmy, mouse.dy, 14, dt);
    mouse.dx = mouse.dy = 0;
    const sy = Math.sin(p.yaw),
        cy = Math.cos(p.yaw);

    // ---- move ----
    let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0),
        s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    const l = Math.hypot(f, s) || 1;
    f /= l;
    s /= l;
    const sprint = (keys.ShiftLeft || keys.ShiftRight) && f > 0 && !mouse.l;
    const sp = sprint ? 9.4 : 6.5;
    const wx = (-sy * f + cy * s) * sp,
        wz = (-cy * f - sy * s) * sp;
    if (p.ground) {
        const k = Math.min(1, (f || s ? 11 : 9) * dt);
        p.vx += (wx - p.vx) * k;
        p.vz += (wz - p.vz) * k;
    } else if (f || s) {
        const k = Math.min(1, 2.4 * dt);
        p.vx += (wx - p.vx) * k;
        p.vz += (wz - p.vz) * k;
    }
    p.jbuf -= dt;
    p.coyote -= dt;
    if (keys.Space && !p.jheld) p.jbuf = 0.12;
    p.jheld = !!keys.Space;
    if (p.jbuf > 0 && (p.ground || p.coyote > 0)) {
        p.vy = 6.8;
        p.ground = false;
        p.coyote = 0;
        p.jbuf = 0;
        sfx.step(1.4);
    }
    p.vy -= 19 * dt;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.y += p.vy * dt;
    pushOut(p, 0.38, p.y + STEP, p.y + 1.75);
    const r = Math.hypot(p.x, p.z);
    if (r > ARENA) {
        p.x *= ARENA / r;
        p.z *= ARENA / r;
    }
    const g = groundAt(p.x, p.z, p.y, 0.38);
    if (p.y <= g) {
        if (!p.ground && p.vy < -5) {
            p.dipV = p.vy * 0.045;
            sfx.land();
            fxPuff(p.x, g, p.z, 0.9, 4);
        }
        p.y = g;
        p.vy = 0;
        p.ground = true;
        p.coyote = 0.1;
    } else if (p.ground && p.y - g < STEP + 0.1 && p.vy <= 0) {
        p.y = g;
        p.vy = 0;
        p.coyote = 0.1;
    } else p.ground = false;

    const hs = Math.hypot(p.vx, p.vz);
    if (p.ground && hs > 1) {
        p.bob += hs * dt * 1.15;
        if ((p.step += hs * dt) > 2.5) {
            p.step = 0;
            sfx.step(sprint ? 1.2 : 0.8);
            if (Math.random() < 0.5) fxPuff(p.x, p.y, p.z, 0.4, 1);
        }
    }
    p.dipV += (-p.dip * 120 - p.dipV * 14) * dt;
    p.dip += p.dipV * dt;

    // ---- vitals ----
    p.hurtT += dt;
    if (p.hurtT > 4.5 && p.hp > 0 && p.hp < 100) p.hp = Math.min(100, p.hp + 10 * dt);
    S.dmgFx = Math.max(0, (S.dmgFx || 0) - dt * 1.4);

    // ---- camera ----
    const bobK = clamp(hs / 6.5, 0, 1) * (p.ground ? 1 : 0.2);
    const tr = S.trauma * S.trauma,
        t = S.t * 26;
    S.trauma = Math.max(0, S.trauma - dt * 1.5);
    const shx = (vnoise(t, 1.3) - 0.5) * tr * 0.09,
        shy = (vnoise(t, 7.7) - 0.5) * tr * 0.09,
        shr = (vnoise(t, 4.1) - 0.5) * tr * 0.11;
    p.kickV += (-p.kick * 240 - p.kickV * 20) * dt;
    p.kick += p.kickV * dt;
    p.fovK = damp(p.fovK, sprint ? 0.1 : 0, 6, dt);
    const ey = p.y + 1.66 + Math.sin(p.bob * 2) * 0.03 * bobK + p.dip;
    setCamera(p.x, ey, p.z, p.yaw + shx, p.pitch + shy - p.kick * 0.25, shr + Math.cos(p.bob) * 0.004 * bobK - s * 0.008, 1.36 + p.fovK + Math.abs(p.kick) * 0.3);
    setListener(cam.x, cam.y, cam.z, cam.rx, cam.rz);

    // ---- weapons ----
    if (mouse.wheel) {
        // one swap per flick of the wheel, however many notches it reports
        const now = performance.now();
        if (now - wheelT > WHEEL_SWAP_MS) {
            wheelT = now;
            swapWeapon();
        }
        mouse.wheel = 0;
    }
    if (p.sw < 1) {
        const pre = p.sw;
        p.sw = Math.min(1, p.sw + dt / 0.27);
        if (pre < 0.5 && p.sw >= 0.5) p.weapon = p.next;
    }
    const ready = p.sw >= 1 && p.hp > 0;
    p.rof -= dt;
    p.cool += dt;
    p.gelT += dt;
    p.mzT -= dt;
    p.heat = Math.max(0, p.heat - dt * 0.45);
    if (p.gelT > 0.55) {
        p.gel = Math.min(100, p.gel + 30 * dt);
        if (p.gel > 14) p.dry = false;
    }
    // local viewmodel transform (view space)
    const swp = Math.sin(Math.min(1, p.sw) * PI),
        low = sprint ? 1 : 0;
    p.swx = damp(p.swx, clamp(p.lmx * 0.0016, -0.05, 0.05), 10, dt);
    p.swy = damp(p.swy, clamp(p.lmy * 0.0016, -0.05, 0.05), 10, dt);
    p.low = damp(p.low || 0, low, 8, dt);
    const bx = Math.cos(p.bob) * 0.008 * bobK,
        by = Math.abs(Math.sin(p.bob)) * 0.009 * bobK;
    m4trs(Lm0, 0.19 + bx - p.swx * 0.4 + p.low * 0.03, -0.205 - by - swp * 0.3 - p.dip * 0.5 - p.low * 0.05 + p.vy * 0.0025, -0.43 - p.kick * 0.22, -p.swx * 0.9 - p.low * 0.35 + 0.035, p.swy * 0.9 - p.kick * 1.3 - swp * 0.7 - p.low * 0.12, -p.swx * 1.2 + swp * 0.3);
    m4mul(VM, cam.world, Lm0);

    if (ready && mouse.l) {
        const d = aimDist(cam.x, cam.y, cam.z, cam.fx, cam.fy, cam.fz, 70);
        const tx = cam.x + cam.fx * d,
            ty = cam.y + cam.fy * d,
            tz = cam.z + cam.fz * d;
        if (p.weapon === 0) {
            if (p.rof <= 0) {
                if (p.dry || p.gel < 2.4) {
                    p.dry = true;
                    sfx.dry();
                    p.rof = 0.2;
                } else {
                    vmWorld(0, 0, -0.5, mz);
                    // lob the gel so it lands on the crosshair, or passes through it at the edge of its aim range
                    const reach = Math.min(d, GEL_AIM_RANGE);
                    lobVelocity(cam.x + cam.fx * reach - mz.x, cam.y + cam.fy * reach - mz.y, cam.z + cam.fz * reach - mz.z, lob);
                    fireGel(mz.x, mz.y, mz.z, lob.x + rnds(1.1), lob.y + rnds(0.7), lob.z + rnds(1.1));
                    p.gel -= 2.4;
                    p.gelT = 0;
                    p.rof = 1 / 11.5;
                    p.kickV -= 0.9;
                    p.mzT = 0.05;
                    p.fired++;
                    sfx.gel();
                    for (let i = 0; i < 2; i++) spawn(5, mz.x, mz.y, mz.z, cam.fx * 5 + rnds(2), cam.fy * 5 + rnds(2) + 1, cam.fz * 5 + rnds(2), rnd(0.15, 0.3), 0.03, 0.01, 0.1, 1.4, 0.25, 0.03, 0.7, 0.1, 1, 0.6, 1, 9);
                }
            }
        } else if (p.rof <= 0) {
            vmWorld(0, 0.005, -0.61, mz);
            let dx = tx - mz.x,
                dy = ty - mz.y,
                dz = tz - mz.z;
            const dl = Math.hypot(dx, dy, dz) || 1;
            if (d < 1.2) {
                dx = cam.fx;
                dy = cam.fy;
                dz = cam.fz;
            } else {
                dx /= dl;
                dy /= dl;
                dz /= dl;
            }
            fireSpark(mz.x, mz.y, mz.z, dx, dy, dz);
            p.rof = 0.26;
            p.cool = 0;
            p.heat = Math.min(1, p.heat + 0.3);
            p.kickV -= 3.4;
            p.mzT = 0.06;
            p.sparked++;
            shake(0.07);
            sfx.spark();
            flash(mz.x, mz.y, mz.z, 22, 11, 3, 9, 0.09);
            for (let i = 0; i < 5; i++) spawn(2, mz.x, mz.y, mz.z, dx * rnd(8, 20) + rnds(4), dy * rnd(8, 20) + rnds(4), dz * rnd(8, 20) + rnds(4), rnd(0.1, 0.25), 0.018, 0.008, 14, 8, 3, 7, 1.5, 0.2, 1, 1, 2, 6, 0.02);
        }
    }

    // ---- draw viewmodel (layer 1) ----
    light(cam.x + cam.rx * 0.5 + cam.ux * 0.5, cam.y + cam.ry * 0.5 + cam.uy * 0.5, cam.z + cam.rz * 0.5 + cam.uz * 0.5, 0.9, 1.05, 1.3, 1.8);
    if (p.hp > 0) {
        if (p.weapon === 0) {
            addInstance(M.gunGel, VM, 1, 1, 1, 0, 1, 0, 1);
            const fill = Math.max(0.02, p.gel / 100);
            m4aim(Lm, -0.086, 0.018, -0.014, 0, 0, -1, 1, 0.162 * fill, 1);
            m4mul(Tm, VM, Lm);
            addInstance(M.gelTank, Tm, p.dry ? 3 : 1, p.dry ? 0.3 : 1, p.dry ? 0.2 : 1, 0, 0.7 + 0.25 * Math.sin(S.t * 3), 0, 1);
            if (p.mzT > 0) {
                m4trs(Lm, 0, 0, -0.51, 0, 0, rnd(6), 0.1);
                m4mul(Tm, VM, Lm);
                addInstance(M.mzFlash, Tm, 0.25, 1, 0.3, 0, 0.5, 0, 1);
            }
        } else {
            addInstance(M.gunSpark, VM, 1, 1, 1, 0, 1 + p.heat * 2, 0, 1);
            addInstance(M.sparkCoil, VM, 1, 1, 1, 0, 0.1 + p.heat * 1.8, 0, 1);
            const fk = 0.75 + 0.25 * Math.sin(S.t * 31) + 0.2 * Math.sin(S.t * 47 + 1);
            m4aim(Lm, 0, 0.008, -0.605, 0, 0.3, -1, 0.018, 0.045 * fk, 0.018);
            m4mul(Tm, VM, Lm);
            addInstance(M.flame, Tm, 1, 1, 1, 0, 1.6, 0, 1);
            if (p.mzT > 0) {
                m4trs(Lm, 0, 0.005, -0.63, 0, 0, rnd(6), 0.17);
                m4mul(Tm, VM, Lm);
                addInstance(M.mzFlash, Tm, 1, 0.55, 0.2, 0, 1.6, 0, 1);
            }
        }
    }
}
