// Gel, ignition, fire, enemies, boss and the encounter director.
import { S, spawn, sprite, light, flash, shake, addDebris, fxExplosion, fxGooSplat, fxSparks, fxIce, fxFlame, fxPuff } from './fx.js';
import { W, height, segHit, pushOut, ARENA } from './world.js';
import { goo, addInst } from './render.js';
import { M } from './models.js';
import { sfx } from './audio.js';
import { hud } from './hud.js';
import { rnd, rnds, clamp, lerp, TAU, PI, m4, m4trs, m4mul, m4aim, angDiff, damp } from './math.js';

export const blobs = [],
    foes = [];
const gels = [],
    bolts = [],
    fires = [],
    shots = [];
const H = { x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0 };
const B = m4(),
    Lm = m4(),
    Tm = m4();
export const D = { lit: 0, queue: [], qt: 0, amb: 0, t: 0, boss: null, bossT: -1, won: false, hint: 0, wave: 0 };

export function resetCombat() {
    blobs.length = foes.length = gels.length = bolts.length = fires.length = shots.length = 0;
    Object.assign(D, { lit: 0, queue: [], qt: 0, amb: 3, t: 0, boss: null, bossT: -1, won: false, hint: 0, wave: 0 });
    for (const p of W.pylons) {
        p.lit = false;
        p.hp = W.PYHP;
        p.thaw = 0;
        p.glow = 0;
        p.col.r = 2.2;
    }
    W.heart.awake = false;
    W.heart.diss = 0;
    W.heart.col.off = false;
}

// ---------------------------------------------------------------- player damage
export function hurtPlayer(d, sx, sz) {
    const p = S.pl;
    if (S.mode !== 'play' || p.hp <= 0 || p.god) return;
    p.hp -= d;
    p.hurtT = 0;
    S.dmgFx = Math.min(1, (S.dmgFx || 0) + d / 28 + 0.2);
    shake(0.18 + d / 80);
    sfx.hurt();
    if (sx !== undefined) hud.dmgDir(Math.atan2(sx - p.x, sz - p.z));
    if (p.hp <= 0) p.hp = 0;
}

// ---------------------------------------------------------------- gel blobs
function hostXform(e, lx, ly, lz, o) {
    const c = Math.cos(e.yaw),
        s = Math.sin(e.yaw);
    o.x = e.x + lx * c + lz * s;
    o.y = e.y + ly + (e.rise || 0) - (e.kneel || 0) * 1.43;
    o.z = e.z - lx * s + lz * c;
}
function addBlob(x, y, z, nx, ny, nz, host, node) {
    // merge into a neighbour where possible so puddles grow instead of multiplying
    let best = null,
        bd = host ? 0.3 : 0.3,
        cnt = 0;
    for (const b of blobs) {
        if (b.host !== host || b.heat > 0) continue;
        if (host) cnt++;
        const d = Math.hypot(b.x - x, b.y - y, b.z - z);
        if (d < bd + b.size * 0.25) {
            bd = d;
            best = b;
        }
    }
    if (!best && host && cnt >= (host.type === 3 ? 30 : 12)) {
        let md = 1e9;
        for (const b of blobs)
            if (b.host === host && b.heat === 0) {
                const d = Math.hypot(b.x - x, b.y - y, b.z - z);
                if (d < md) {
                    md = d;
                    best = b;
                }
            }
    }
    if (best) {
        best.m = Math.min(host ? 14 : 30, best.m + 1);
        best.size = Math.min(host ? 0.62 : 0.85, 0.33 * Math.cbrt(best.m));
        best.wobV += 7;
        return best;
    }
    if (blobs.length > 520) {
        const i = blobs.findIndex((b) => !b.host && b.heat === 0);
        if (i >= 0) blobs.splice(i, 1);
    }
    const b = { x, y, z, nx, ny, nz, size: 0.33, m: 1, wob: 0, wobV: 9, heat: 0, fuse: 0.2, host, node, lx: 0, ly: 0, lz: 0, lnx: 0, lnz: 0, seed: Math.random(), age: 0, py: null, fl: 0 };
    if (host) {
        const c = Math.cos(host.yaw),
            s = Math.sin(host.yaw),
            dx = x - host.x,
            dz = z - host.z;
        b.lx = dx * c - dz * s;
        b.lz = dx * s + dz * c;
        b.ly = y - host.y - (host.rise || 0) + (host.kneel || 0) * 1.43;
        b.lnx = nx * c - nz * s;
        b.lnz = nx * s + nz * c;
    } else
        for (const p of W.pylons) if (!p.lit && Math.hypot(x - p.x, z - p.z) < 3.2) b.py = p;
    blobs.push(b);
    return b;
}
function igniteBlob(b, fuse) {
    if (b.heat > 0) return;
    b.heat = 0.001;
    b.fuse = fuse;
    sfx.ignite(b.x, b.y, b.z);
}
export function igniteAt(x, y, z, r, host) {
    let n = 0;
    for (const b of blobs) {
        if (b.heat > 0) continue;
        if (host && b.host === host) {
            const d = Math.hypot(b.x - x, b.y - y, b.z - z);
            if (d < r + 0.9) {
                igniteBlob(b, rnd(0.1, 0.18) + d * 0.05);
                n++;
            }
            continue;
        }
        const d = Math.hypot(b.x - x, b.y - y, b.z - z);
        if (d < r + b.size) {
            igniteBlob(b, rnd(0.1, 0.2));
            n++;
        }
    }
    return n;
}
function detonate(b) {
    const { x, y, z } = b,
        k = b.size / 0.33,
        Rr = 1.9 + 2.0 * b.size,
        Dm = 58 * Math.pow(b.m, 0.75);
    S.stats.det++;
    S.chain++;
    S.chainT = 0.8;
    if (S.chain > S.stats.best) S.stats.best = S.chain;
    if (S.chain === 5 || S.chain === 12 || S.chain === 25) S.hitStop = 0.045;
    fxExplosion(x, y, z, 0.6 + b.size * 1.3);
    sfx.boom(x, y, z, k);
    const p = S.pl,
        pd = Math.hypot(p.x - x, p.y + 0.9 - y, p.z - z);
    shake(clamp(0.5 * (1 - pd / 24), 0, 0.5));
    if (pd < Rr * 0.85) {
        const f = 1 - pd / (Rr * 0.85);
        hurtPlayer(Math.min(45, Dm * 0.3) * f, x, z);
        const l = Math.hypot(p.x - x, p.z - z) || 1;
        p.vx += ((p.x - x) / l) * 9 * f;
        p.vz += ((p.z - z) / l) * 9 * f;
        p.vy += 4 * f;
    }
    for (const e of foes) {
        if (e.dead) continue;
        if (b.host === e) {
            damage(e, Dm * 1.35, x, y, z, b.node, true);
            continue;
        }
        let md = 1e9,
            mn = -1;
        for (const h of e.hs) {
            if (h[4] !== undefined && h[4] >= 0 && e.nodes && e.nodes[h[4]].hp <= 0) continue;
            hostXform(e, h[0], h[1], h[2], H);
            const d = Math.hypot(H.x - x, H.y - y, H.z - z) - h[3];
            if (d < md) {
                md = d;
                mn = h[4] === undefined ? -1 : h[4];
            }
        }
        if (md < Rr) {
            const f = 1 - Math.pow(Math.max(0, md) / Rr, 1.5);
            damage(e, Dm * f, x, y, z, mn, true);
            const l = Math.hypot(e.x - x, e.z - z) || 1;
            e.vx += (((e.x - x) / l) * 7 * f) / e.mass;
            e.vz += (((e.z - z) / l) * 7 * f) / e.mass;
            if (e.type === 0) e.vy += 4 * f;
        }
    }
    for (const q of W.pylons) {
        if (q.lit) continue;
        const d = Math.hypot(q.x - x, q.z - z);
        if (d < Rr + 1.8 && y < q.y + 9) {
            q.hp -= Dm * (b.py === q ? 1.15 : 0.6);
            q.hitT = 1;
            fxIce(x + (q.x - x) * 0.3, y + 0.4, z + (q.z - z) * 0.3, 1.3, 8);
            sfx.shatter(x, y, z, 0.7);
        }
    }
    for (const o of blobs) {
        if (o === b || o.heat > 0) continue;
        const d = Math.hypot(o.x - x, o.y - y, o.z - z);
        if (d < Rr * 0.95 + o.size) igniteBlob(o, 0.07 + d * 0.05 + rnd(0.07));
    }
    if (!b.host && fires.length < 46) fires.push({ x, y: Math.max(y - 0.1, height(x, z)), z, life: 2.2 + b.size * 2.5, r: 0.9 + b.size, t: 0 });
    blobs.splice(blobs.indexOf(b), 1);
}

function updateBlobs(dt) {
    let n = 0;
    const gd = goo.data;
    for (const e of foes) e.goo = 0;
    for (let i = blobs.length - 1; i >= 0; i--) {
        const b = blobs[i];
        b.age += dt;
        if (b.host) {
            const e = b.host;
            if (e.dead) {
                fxGooSplat(b.x, b.y, b.z, 0, 1, 0, 3);
                blobs.splice(i, 1);
                continue;
            }
            hostXform(e, b.lx, b.ly, b.lz, b);
            const c = Math.cos(e.yaw),
                s = Math.sin(e.yaw);
            b.nx = b.lnx * c + b.lnz * s;
            b.nz = -b.lnx * s + b.lnz * c;
            e.goo += b.size;
        }
        b.wobV += (-b.wob * 190 - b.wobV * 9) * dt;
        b.wob += b.wobV * dt;
        if (b.heat > 0) {
            b.heat += dt / b.fuse;
            if (Math.random() < dt * 40) fxFlame(b.x, b.y + 0.1, b.z, 0.5 + b.size);
            light(b.x, b.y + 0.3, b.z, 9, 3.5, 0.8, 4);
            if (b.heat >= 1) {
                detonate(b);
                continue;
            }
        }
    }
    for (const b of blobs) {
        if (n >= 990) break;
        const o = n++ * 12,
            pop = Math.min(1, b.age * 9);
        gd[o] = b.x;
        gd[o + 1] = b.y;
        gd[o + 2] = b.z;
        gd[o + 3] = b.size * pop;
        gd[o + 4] = b.nx;
        gd[o + 5] = b.ny;
        gd[o + 6] = b.nz;
        gd[o + 7] = b.host ? 0.7 : 0.48;
        gd[o + 8] = b.wob;
        gd[o + 9] = Math.min(1, b.heat);
        gd[o + 10] = b.seed;
        gd[o + 11] = 0;
    }
    for (const g of gels) {
        if (n >= 1000) break;
        const o = n++ * 12,
            l = Math.hypot(g.vx, g.vy, g.vz) || 1;
        gd[o] = g.x;
        gd[o + 1] = g.y;
        gd[o + 2] = g.z;
        gd[o + 3] = 0.13 * Math.min(1, 0.4 + g.age * 8);
        gd[o + 4] = g.vx / l;
        gd[o + 5] = g.vy / l;
        gd[o + 6] = g.vz / l;
        gd[o + 7] = 1.9;
        gd[o + 8] = Math.sin(g.age * 30) * 0.25;
        gd[o + 9] = 0;
        gd[o + 10] = g.seed;
        gd[o + 11] = 0;
    }
    goo.n = n;
}

// ---------------------------------------------------------------- hit tests
function segSphere(ax, ay, az, dx, dy, dz, cx, cy, cz, r) {
    const ox = ax - cx,
        oy = ay - cy,
        oz = az - cz;
    const a = dx * dx + dy * dy + dz * dz,
        b = 2 * (ox * dx + oy * dy + oz * dz),
        c = ox * ox + oy * oy + oz * oz - r * r;
    if (c < 0) return 0;
    const disc = b * b - 4 * a * c;
    if (disc < 0 || a < 1e-9) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : -1;
}
const eh = { e: null, node: -1, t: 0, cx: 0, cy: 0, cz: 0 };
function segFoes(ax, ay, az, bx, by, bz, pad) {
    const dx = bx - ax,
        dy = by - ay,
        dz = bz - az;
    eh.e = null;
    eh.t = 2;
    for (const e of foes) {
        if (e.dead) continue;
        if (Math.hypot(e.x - ax, e.z - az) > e.br + Math.hypot(dx, dz) + 1) continue;
        for (const h of e.hs) {
            const nd = h[4] === undefined ? -1 : h[4];
            if (nd >= 0 && e.nodes[nd].hp <= 0) continue;
            hostXform(e, h[0], h[1], h[2], H);
            const t = segSphere(ax, ay, az, dx, dy, dz, H.x, H.y, H.z, h[3] + pad);
            if (t >= 0 && t < eh.t) {
                eh.t = t;
                eh.e = e;
                eh.node = nd;
                eh.cx = H.x;
                eh.cy = H.y;
                eh.cz = H.z;
            }
        }
    }
    return eh.e ? eh.t : -1;
}

// ---------------------------------------------------------------- player weapons
export function fireGel(x, y, z, vx, vy, vz) {
    gels.push({ x, y, z, vx, vy, vz, age: 0, seed: Math.random() });
}
// distance to whatever is under the crosshair
export function aimDist(ox, oy, oz, dx, dy, dz, max) {
    let d = max;
    const t = segHit(ox, oy, oz, ox + dx * max, oy + dy * max, oz + dz * max, H);
    if (t >= 0) d = t * max;
    const te = segFoes(ox, oy, oz, ox + dx * max, oy + dy * max, oz + dz * max, 0.1);
    if (te >= 0 && te * max < d) d = te * max;
    return d;
}
export function fireSpark(x, y, z, dx, dy, dz) {
    bolts.push({ x, y, z, vx: dx * 150, vy: dy * 150, vz: dz * 150, age: 0 });
}
function updateShots(dt) {
    for (let i = gels.length - 1; i >= 0; i--) {
        const g = gels[i];
        g.age += dt;
        g.vy -= 15 * dt;
        const nx = g.x + g.vx * dt,
            ny = g.y + g.vy * dt,
            nz = g.z + g.vz * dt;
        let tw = segHit(g.x, g.y, g.z, nx, ny, nz, H);
        const hx = H.x,
            hy = H.y,
            hz = H.z,
            hnx = H.nx,
            hny = H.ny,
            hnz = H.nz;
        const te = segFoes(g.x, g.y, g.z, nx, ny, nz, 0.08);
        if (te >= 0 && (tw < 0 || te < tw)) {
            const px = g.x + (nx - g.x) * te,
                py = g.y + (ny - g.y) * te,
                pz = g.z + (nz - g.z) * te;
            let ax = px - eh.cx,
                ay = py - eh.cy,
                az = pz - eh.cz;
            const l = Math.hypot(ax, ay, az) || 1;
            ax /= l;
            ay /= l;
            az /= l;
            const b = addBlob(px - ax * 0.08, py - ay * 0.08, pz - az * 0.08, ax, ay, az, eh.e, eh.node);
            if (eh.e.burn > 0) igniteBlob(b, 0.2);
            fxGooSplat(px, py, pz, ax, ay, az, 4);
            sfx.splat(px, py, pz);
            eh.e.wake = 1;
            gels.splice(i, 1);
        } else if (tw >= 0) {
            addBlob(hx, hy, hz, hnx, hny, hnz, null, -1);
            fxGooSplat(hx, hy, hz, hnx, hny, hnz, 5);
            sfx.splat(hx, hy, hz);
            gels.splice(i, 1);
        } else if (g.age > 4) gels.splice(i, 1);
        else {
            g.x = nx;
            g.y = ny;
            g.z = nz;
        }
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.age += dt;
        const nx = b.x + b.vx * dt,
            ny = b.y + b.vy * dt,
            nz = b.z + b.vz * dt;
        const tw = segHit(b.x, b.y, b.z, nx, ny, nz, H);
        const hx = H.x,
            hy = H.y,
            hz = H.z,
            hnx = H.nx,
            hny = H.ny,
            hnz = H.nz;
        const te = segFoes(b.x, b.y, b.z, nx, ny, nz, 0.12);
        let t = 1,
            kind = 0;
        if (te >= 0 && (tw < 0 || te < tw)) {
            t = te;
            kind = 2;
        } else if (tw >= 0) {
            t = tw;
            kind = 1;
        }
        const dx = (nx - b.x) * t,
            dy = (ny - b.y) * t,
            dz = (nz - b.z) * t;
        // anything gel-coated along the flight path lights up
        for (const o of blobs) {
            if (o.heat > 0) continue;
            if (segSphere(b.x, b.y, b.z, dx, dy, dz, o.x, o.y + 0.08, o.z, o.size * 0.8 + 0.28) >= 0) igniteBlob(o, rnd(0.09, 0.16));
        }
        sprite(2, b.x + dx, b.y + dy, b.z + dz, 0.045, 22, 10, 2.5, 1, -b.vx, -b.vy, -b.vz, 0.016);
        light(b.x + dx, b.y + dy, b.z + dz, 5, 2.2, 0.6, 4.5);
        if (kind === 2) {
            const px = b.x + dx,
                py = b.y + dy,
                pz = b.z + dz,
                e = eh.e;
            fxSparks(px, py, pz, -b.vx / 150, -b.vy / 150, -b.vz / 150, 7);
            flash(px, py, pz, 12, 6, 2, 5, 0.12);
            sfx.tick(px, py, pz);
            const lit = igniteAt(px, py, pz, e.type === 3 ? 1.5 : 0.7, e);
            if (!lit) {
                damage(e, 5, px, py, pz, eh.node, false);
                hud.resist();
            }
            e.wake = 1;
            bolts.splice(i, 1);
        } else if (kind === 1) {
            fxSparks(hx, hy, hz, hnx, hny, hnz, 8);
            flash(hx, hy, hz, 12, 6, 2, 5, 0.12);
            sfx.tick(hx, hy, hz);
            igniteAt(hx, hy, hz, 0.75);
            bolts.splice(i, 1);
        } else if (b.age > 1.2) bolts.splice(i, 1);
        else {
            b.x = nx;
            b.y = ny;
            b.z = nz;
        }
    }
}

// ---------------------------------------------------------------- fire patches
function updateFires(dt) {
    const p = S.pl;
    let near = 0;
    for (let i = fires.length - 1; i >= 0; i--) {
        const f = fires[i];
        if ((f.life -= dt) <= 0) {
            fires.splice(i, 1);
            continue;
        }
        const k = Math.min(1, f.life / 0.8);
        if (Math.random() < dt * 22 * k) fxFlame(f.x + rnds(f.r * 0.5), f.y, f.z + rnds(f.r * 0.5), (0.7 + f.r * 0.5) * (0.5 + 0.5 * k));
        light(f.x, f.y + 0.7, f.z, 11 * k * (0.8 + 0.4 * Math.random()), 4.2 * k, 0.9 * k, 6 + f.r);
        const pd = Math.hypot(p.x - f.x, p.z - f.z);
        near += k / (1 + pd * pd * 0.02);
        if (pd < f.r && Math.abs(p.y - f.y) < 1.5) hurtPlayer(9 * dt, f.x, f.z);
        if ((f.t += dt) > 0.12) {
            f.t = 0;
            for (const b of blobs) if (b.heat === 0 && Math.hypot(b.x - f.x, b.y - f.y, b.z - f.z) < f.r + b.size) igniteBlob(b, rnd(0.12, 0.3));
            for (const e of foes) if (!e.dead && e.type !== 3 && Math.hypot(e.x - f.x, e.z - f.z) < f.r + e.r * 0.6 && Math.abs(e.y - f.y) < 2) e.burn = Math.max(e.burn, 0.5);
        }
    }
    S.fire = near;
}

// ---------------------------------------------------------------- enemies
// type: 0 skitter, 1 lancer, 2 bulwark, 3 colossus
const TY = [
    { hp: 70, r: 0.5, sp: 6.4, mass: 1, br: 1, hs: [[0, 0.42, 0, 0.56]] },
    { hp: 115, r: 0.7, sp: 5.2, mass: 1.3, br: 1.2, hs: [[0, 0, 0, 0.74]] },
    { hp: 800, r: 1.0, sp: 2.4, mass: 6, br: 2.2, hs: [[0, 1.95, 0, 0.95], [0, 0.8, 0, 0.72]] },
    { hp: 3400, r: 3, sp: 1.9, mass: 60, br: 6.5, hs: [[0, 6.4, 0, 2.6], [0, 2.6, 0, 1.9], [-3.25, 7.7, 0, 1.35, 0], [3.25, 7.7, 0, 1.35, 1], [0, 6.0, -2.8, 1.35, 2], [0, 10.5, 0.1, 1.35, 3]] },
];
const NODEP = [[-3.25, 7.7, 0], [3.25, 7.7, 0], [0, 6.0, -2.8], [0, 10.5, 0.1]];
const BS = 1.3;
export function spawnFoe(type, x, z) {
    const t = TY[type];
    const e = {
        type, x, y: height(x, z), z, vx: 0, vy: 0, vz: 0, yaw: Math.atan2(x - S.pl.x, z - S.pl.z), hp: t.hp, max: t.hp, r: t.r, sp: t.sp, mass: t.mass, br: t.br, hs: t.hs,
        st: 0, t: 0, flash: 0, burn: 0, goo: 0, rise: type === 3 ? -12 : -1.3, sc: type === 3 ? BS : 1, anim: rnd(TAU), dead: false, strafe: Math.random() < 0.5 ? -1 : 1, sft: rnd(2, 5),
        cd: rnd(1.5, 3), charge: 0, arm: 0, seed: rnd(100), hitP: false, air: false, wake: 0, nodes: null, pitch: 0,
    };
    if (type === 1) e.y += 3.6;
    if (type === 3) {
        e.nodes = NODEP.map(() => ({ hp: 420, sc: 1 }));
        e.stun = 0;
        e.vcd = 4;
        e.scd = 7;
        e.ring = -1;
        e.cycle = 0;
        e.st = 9;
    }
    foes.push(e);
    fxIce(x, e.y + 0.3, z, type === 2 ? 1.6 : 1, 12);
    fxPuff(x, e.y, z, type === 2 ? 2 : 1.2, 5);
    sfx.shatter(x, e.y, z, 0.8);
    return e;
}
function damage(e, d, x, y, z, node, boom) {
    if (e.dead) return;
    if (e.type === 3) {
        if (e.st === 9) return;
        if (node >= 0 && e.nodes[node].hp > 0) {
            const nd = e.nodes[node];
            nd.hp -= d;
            nd.fl = 1;
            hud.hit(false);
            if (nd.hp <= 0) {
                hostXform(e, NODEP[node][0], NODEP[node][1], NODEP[node][2], H);
                fxIce(H.x, H.y, H.z, 2.4, 26);
                for (let i = 0; i < 9; i++) addDebris(M.debA, H.x, H.y, H.z, rnds(7), rnd(2, 9), rnds(7), rnd(1.4, 2.6), rnd(1.5, 3), 1, 1, 1, 1.5);
                sfx.shatter(H.x, H.y, H.z, 1.6);
                flash(H.x, H.y, H.z, 10, 30, 50, 14, 0.4);
                shake(0.3);
                hud.hit(true);
                if (e.nodes.every((n) => n.hp <= 0)) {
                    e.stun = 7.5;
                    e.st = 5;
                    e.t = 0;
                    hud.banner('CORE EXPOSED', 'pour it on');
                    sfx.roar(e.x, e.y + 5, e.z);
                }
            }
            return;
        }
        d *= e.stun > 0 ? 1 : 0.1;
    }
    e.hp -= d;
    e.flash = 1;
    if (boom) e.burn = Math.max(e.burn, 1.2);
    if (d > 3) hud.hit(false);
    if (e.hp <= 0) kill(e);
}
function kill(e) {
    e.dead = true;
    S.stats.kills++;
    hud.hit(true);
    sfx.kill();
    const cy = e.y + (e.type === 2 ? 1.6 : e.type === 3 ? 6 : 0.4),
        s = [1, 1.2, 2, 4][e.type];
    fxIce(e.x, cy, e.z, s, 14 + e.type * 8);
    sfx.shatter(e.x, cy, e.z, s);
    const n = [6, 8, 14, 40][e.type];
    for (let i = 0; i < n; i++) addDebris(i % 4 === 3 ? M.debB : M.debA, e.x + rnds(e.r), cy + rnds(e.r), e.z + rnds(e.r), e.vx * 0.5 + rnds(6), rnd(2, 8) * (1 + s * 0.2), e.vz * 0.5 + rnds(6), rnd(0.7, 1.5) * (0.7 + s * 0.4), rnd(1.4, 3));
    if (e.type === 3) {
        D.won = true;
        D.bossT = 0;
        S.slowmo = 3;
        for (const o of foes) if (o !== e) o.hp = 0;
    }
}

function moveFoe(e, dt, wx, wz, accel) {
    const slow = 1 / (1 + e.goo * (e.type === 2 ? 0.35 : e.type === 3 ? 0.05 : 1.3));
    const k = Math.min(1, accel * dt);
    e.vx += (wx * slow - e.vx) * k;
    e.vz += (wz * slow - e.vz) * k;
    // separation
    for (const o of foes) {
        if (o === e || o.dead) continue;
        const dx = e.x - o.x,
            dz = e.z - o.z,
            rr = e.r + o.r,
            d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-5 && Math.abs(e.y - o.y) < 2.5) {
            const d = Math.sqrt(d2),
                f = ((rr - d) / d) * (o.mass / (e.mass + o.mass)) * 0.6;
            e.x += dx * f;
            e.z += dz * f;
        }
    }
    e.x += e.vx * dt;
    e.z += e.vz * dt;
    if (e.type !== 3) pushOut(e, e.r, e.y + 0.4, e.y + 1.5);
    const r = Math.hypot(e.x, e.z);
    if (r > ARENA + 2) {
        e.x *= (ARENA + 2) / r;
        e.z *= (ARENA + 2) / r;
    }
}
function shardAt(e, x, y, z, speed, spread, dmg) {
    const p = S.pl,
        d = Math.hypot(p.x - x, p.y + 1.1 - y, p.z - z),
        T = d / speed;
    let dx = p.x + p.vx * T * 0.75 - x + rnds(spread),
        dy = p.y + 1.15 - y + rnds(spread * 0.5),
        dz = p.z + p.vz * T * 0.75 - z + rnds(spread);
    const l = Math.hypot(dx, dy, dz) || 1;
    shots.push({ type: 0, x, y, z, vx: (dx / l) * speed, vy: (dy / l) * speed, vz: (dz / l) * speed, life: 4, dmg });
    sfx.shard(x, y, z);
}

function updateFoes(dt) {
    const p = S.pl;
    for (let i = foes.length - 1; i >= 0; i--) {
        const e = foes[i];
        if (e.dead) {
            foes.splice(i, 1);
            continue;
        }
        if (e.hp <= 0) {
            kill(e);
            continue;
        }
        e.t += dt;
        e.flash = Math.max(0, e.flash - dt * 5);
        if (e.rise < 0) e.rise = Math.min(0, e.rise + dt * (e.type === 3 ? 2.6 : 2.2));
        if (e.burn > 0) {
            e.burn -= dt;
            if (e.type !== 3) e.hp -= 14 * dt;
            if (Math.random() < dt * 18) fxFlame(e.x + rnds(e.r * 0.6), e.y + (e.type === 2 ? 1.2 : 0.3) + rnd(0.5), e.z + rnds(e.r * 0.6), 0.5 + e.r * 0.4);
            light(e.x, e.y + 0.8, e.z, 7, 2.6, 0.6, 5);
        }
        const dx = p.x - e.x,
            dz = p.z - e.z,
            dist = Math.hypot(dx, dz) || 1,
            ux = dx / dist,
            uz = dz / dist;
        const tyaw = Math.atan2(-dx, -dz);
        if ((e.sft -= dt) < 0) {
            e.sft = rnd(2, 5);
            e.strafe = -e.strafe;
        }
        const g = height(e.x, e.z);

        if (e.type === 0) {
            // ---------------- skitter: flank, wind up, pounce
            if (e.st === 0) {
                const fl = dist > 5 ? 0.55 * e.strafe : 0;
                moveFoe(e, dt, (ux - uz * fl) * e.sp, (uz + ux * fl) * e.sp, 7);
                e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 9);
                e.anim += dt * (4 + Math.hypot(e.vx, e.vz) * 2.6);
                if (dist < 3.4 && e.cd <= 0 && e.rise >= 0 && Math.abs(p.y - e.y) < 2) {
                    e.st = 1;
                    e.t = 0;
                    sfx.chirp(e.x, e.y, e.z);
                }
            } else if (e.st === 1) {
                moveFoe(e, dt, 0, 0, 10);
                e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 12);
                e.pitch = -Math.min(1, e.t / 0.3) * 0.35;
                if (e.t > 0.32) {
                    e.st = 2;
                    e.t = 0;
                    const slow = 1 / (1 + e.goo * 1.3);
                    e.vx = ux * 13 * slow;
                    e.vz = uz * 13 * slow;
                    e.vy = 4.6 * slow;
                    e.air = true;
                    e.hitP = false;
                }
            } else if (e.st === 2) {
                e.x += e.vx * dt;
                e.z += e.vz * dt;
                pushOut(e, e.r, e.y + 0.4, e.y + 1.2);
                e.pitch = clamp(-e.vy * 0.08, -0.5, 0.5);
                if (!e.hitP && dist < 1.25 && Math.abs(p.y + 0.6 - e.y) < 1.5) {
                    e.hitP = true;
                    hurtPlayer(11, e.x, e.z);
                }
                if (!e.air) {
                    e.st = 3;
                    e.t = 0;
                    e.cd = rnd(0.9, 1.6);
                }
            } else {
                moveFoe(e, dt, 0, 0, 6);
                e.pitch *= 0.8;
                if (e.t > 0.45) e.st = 0;
            }
            e.cd -= dt;
            e.vy -= 20 * dt;
            e.y += e.vy * dt;
            if (e.y <= g) {
                e.y = g;
                e.vy = 0;
                e.air = false;
            }
            drawSkitter(e);
        } else if (e.type === 1) {
            // ---------------- lancer: orbit at range, telegraph, fire a shard
            const want = 15,
                rad = (dist - want) * 0.5;
            const grounded = e.goo > 1.15;
            let wx = (ux * clamp(rad, -1, 1) - uz * e.strafe * 0.75) * e.sp,
                wz = (uz * clamp(rad, -1, 1) + ux * e.strafe * 0.75) * e.sp;
            if (e.st === 1) {
                wx *= 0.15;
                wz *= 0.15;
            }
            moveFoe(e, dt, wx, wz, 2.5);
            const ty = g + (grounded ? 0.75 : Math.max(1.2, 3.7 - e.goo * 2.2)) + Math.sin(S.t * 1.7 + e.seed) * 0.25;
            e.y += (ty - e.y) * Math.min(1, dt * (grounded ? 5 : 2.2));
            e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 6);
            if (e.st === 0) {
                e.charge = Math.max(0, e.charge - dt * 3);
                if ((e.cd -= dt) <= 0 && dist < 36 && e.rise >= 0 && !grounded) {
                    e.st = 1;
                    e.t = 0;
                    sfx.charge(e.x, e.y, e.z);
                }
            } else {
                e.charge = Math.min(1, e.t / 0.75);
                if (e.t > 0.8) {
                    shardAt(e, e.x + ux * 0.6, e.y, e.z + uz * 0.6, 30, 0.5, 13);
                    e.st = 0;
                    e.cd = rnd(2.1, 3.3);
                    e.vx -= ux * 3;
                    e.vz -= uz * 3;
                }
            }
            if (e.charge > 0) light(e.x, e.y, e.z, 2 * e.charge, 7 * e.charge, 10 * e.charge, 6);
            drawLancer(e, ux, (p.y + 1.1 - e.y) / dist, uz);
        } else if (e.type === 2) {
            // ---------------- bulwark: advance, lob ice, ground slam
            e.y = g;
            if (e.st === 0) {
                moveFoe(e, dt, ux * e.sp, uz * e.sp, 3);
                e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 2.5);
                e.anim += dt * Math.hypot(e.vx, e.vz) * 1.5;
                e.arm = damp(e.arm, 0, 6, dt);
                e.cd -= dt;
                if (e.rise >= 0) {
                    if (dist < 4.4) {
                        e.st = 1;
                        e.t = 0;
                        sfx.charge(e.x, e.y + 2, e.z);
                    } else if (dist > 9 && dist < 44 && e.cd <= 0) {
                        e.st = 3;
                        e.t = 0;
                    }
                }
            } else if (e.st === 1) {
                moveFoe(e, dt, 0, 0, 6);
                e.arm = damp(e.arm, 2.9, 7, dt);
                if (e.t > 0.8) {
                    e.st = 2;
                    e.t = 0;
                }
            } else if (e.st === 2) {
                moveFoe(e, dt, 0, 0, 6);
                e.arm = damp(e.arm, 0.9, 30, dt);
                if (e.t > 0.09 && !e.hitP) {
                    e.hitP = true;
                    const sx = e.x - Math.sin(e.yaw) * 1.6,
                        sz = e.z - Math.cos(e.yaw) * 1.6;
                    slamFx(sx, g, sz, 5.4, 28);
                }
                if (e.t > 1.1) {
                    e.st = 0;
                    e.hitP = false;
                    e.cd = Math.max(e.cd, 1.5);
                }
            } else {
                moveFoe(e, dt, 0, 0, 6);
                e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 5);
                e.arm = damp(e.arm, e.t < 0.55 ? 2.6 : 0.6, e.t < 0.55 ? 7 : 22, dt);
                if (e.t > 0.6 && !e.hitP) {
                    e.hitP = true;
                    const T = dist / 17 + 0.45,
                        sx = e.x,
                        sy = e.y + 3,
                        sz = e.z;
                    shots.push({ type: 1, x: sx, y: sy, z: sz, vx: (p.x + p.vx * T * 0.5 - sx) / T, vy: (p.y - sy + 0.5 * 15 * T * T) / T, vz: (p.z + p.vz * T * 0.5 - sz) / T, life: 6, dmg: 20, rot: 0 });
                    sfx.shard(sx, sy, sz);
                }
                if (e.t > 1.0) {
                    e.st = 0;
                    e.hitP = false;
                    e.cd = rnd(4, 6);
                }
            }
            drawBulwark(e);
        } else updateBoss(e, dt, dist, ux, uz, tyaw, g);
    }
}
function slamFx(x, y, z, r, dmg) {
    const p = S.pl;
    sfx.slam(x, y, z);
    spawn(4, x, y + 0.1, z, 0, 0, 0, 0.5, 1, r * 2.3, 2, 5, 8, 0.4, 1, 2, 0.8, 1);
    fxPuff(x, y, z, 3, 10);
    fxIce(x, y + 0.2, z, 1.5, 12);
    flash(x, y + 1, z, 8, 20, 34, 12, 0.3);
    S.stamps.push(x, z, 2.2, 0.25, 0);
    const d = Math.hypot(p.x - x, p.z - z);
    shake(clamp(0.7 * (1 - d / 30), 0, 0.7));
    if (d < r && p.y - height(p.x, p.z) < 1.0) {
        const f = 1 - (d / r) * 0.6;
        hurtPlayer(dmg * f, x, z);
        p.vx += ((p.x - x) / (d || 1)) * 10 * f;
        p.vz += ((p.z - z) / (d || 1)) * 10 * f;
        p.vy += 5.5 * f;
    }
}

function updateBoss(e, dt, dist, ux, uz, tyaw, g) {
    const p = S.pl;
    e.y = g;
    for (const n of e.nodes) {
        n.fl = Math.max(0, (n.fl || 0) - dt * 5);
        n.sc = damp(n.sc, n.hp > 0 ? 1 : 0, 6, dt);
    }
    if (e.st === 9) {
        // rising out of the heart
        if (e.rise >= 0) {
            e.st = 0;
            hud.banner('THE COLOSSUS', 'shatter the frost nodes');
        }
        shake(0.12);
        if (Math.random() < dt * 30) fxIce(e.x + rnds(3), 0.5 + rnd(3), e.z + rnds(3), 2, 3);
    } else if (e.st === 5) {
        // stunned: core exposed
        moveFoe(e, dt, 0, 0, 4);
        e.arm = damp(e.arm, 0.5, 3, dt);
        e.kneel = damp(e.kneel || 0, 1, 4, dt);
        if (Math.random() < dt * 20) fxFlame(e.x + rnds(2), e.y + 4 + rnd(2.5), e.z + rnds(2), 1.6);
        if ((e.stun -= dt) <= 0) {
            e.st = 0;
            e.cycle++;
            for (const n of e.nodes) n.hp = 420;
            fxIce(e.x, e.y + 6.5, e.z, 4, 30);
            sfx.roar(e.x, e.y + 5, e.z);
            hud.banner('NODES REFORMING', '');
            for (let i = 0; i < 3 + e.cycle; i++) D.queue.push(0);
            if (e.cycle > 1) D.queue.push(1, 1);
        }
    } else {
        e.kneel = damp(e.kneel || 0, 0, 3, dt);
        const sp = dist > 11 ? e.sp * (1 + e.cycle * 0.15) : 0;
        if (e.st === 0) {
            moveFoe(e, dt, ux * sp, uz * sp, 2);
            e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 1.4);
            e.anim += dt * Math.hypot(e.vx, e.vz) * 0.75;
            e.arm = damp(e.arm, 0, 4, dt);
            e.vcd -= dt;
            e.scd -= dt;
            if (e.scd <= 0 || (dist < 10 && e.scd < 4)) {
                e.st = 1;
                e.t = 0;
                sfx.charge(e.x, e.y + 5, e.z);
            } else if (e.vcd <= 0) {
                e.st = 3;
                e.t = 0;
                e.n = 0;
                sfx.charge(e.x, e.y + 7, e.z);
            }
        } else if (e.st === 1) {
            moveFoe(e, dt, 0, 0, 4);
            e.arm = damp(e.arm, 2.8, 4, dt);
            if (e.t > 1.05) {
                e.st = 2;
                e.t = 0;
                e.hitP = false;
            }
        } else if (e.st === 2) {
            moveFoe(e, dt, 0, 0, 4);
            e.arm = damp(e.arm, 0.8, 26, dt);
            if (e.t > 0.1 && !e.hitP) {
                e.hitP = true;
                const sx = e.x - Math.sin(e.yaw) * 4.4,
                    sz = e.z - Math.cos(e.yaw) * 4.4;
                slamFx(sx, g, sz, 8, 30);
                e.ring = 0;
                e.rx = sx;
                e.rz = sz;
                e.ringHit = false;
            }
            if (e.t > 1.3) {
                e.st = 0;
                e.scd = rnd(6, 8) - e.cycle;
            }
        } else if (e.st === 3) {
            moveFoe(e, dt, ux * sp * 0.4, uz * sp * 0.4, 2);
            e.yaw += angDiff(e.yaw, tyaw) * Math.min(1, dt * 2.5);
            e.charge = Math.min(1, e.t / 0.6);
            if (e.t > 0.65 + e.n * 0.16) {
                hostXform(e, rnds(1.5), 9.3, -1.7, H);
                shardAt(e, H.x, H.y, H.z, 34, 1.6, 12);
                if (++e.n >= 5 + e.cycle * 2) {
                    e.st = 0;
                    e.vcd = rnd(2.6, 3.8) - e.cycle * 0.4;
                    e.charge = 0;
                }
            }
        }
    }
    // travelling ground shockwave: jump it
    if (e.ring >= 0) {
        e.ring += dt * 15;
        const rr = e.ring;
        for (let i = 0; i < 5; i++) {
            const a = rnd(TAU),
                x = e.rx + Math.cos(a) * rr,
                z = e.rz + Math.sin(a) * rr;
            if (Math.hypot(x, z) < ARENA + 6) spawn(3, x, height(x, z) + 0.2, z, Math.cos(a) * 5, rnd(1, 3), Math.sin(a) * 5, rnd(0.3, 0.6), 0.6, 1.8, 0.6, 0.9, 1.4, 0.4, 0.6, 1, 0.5, 0.3, 2, 0);
        }
        spawn(4, e.rx, g + 0.12, e.rz, 0, 0, 0, 0.06, rr * 1.22, rr * 1.22, 1.2, 3, 5, 1.2, 3, 5, 0.6, 1);
        const pd = Math.hypot(p.x - e.rx, p.z - e.rz);
        if (!e.ringHit && Math.abs(pd - rr) < 0.9 && p.y - height(p.x, p.z) < 0.75) {
            e.ringHit = true;
            hurtPlayer(22, e.rx, e.rz);
            p.vy += 5;
        }
        if (rr > 34) e.ring = -1;
    }
    const exposed = e.st === 5 ? 1 : 0;
    light(e.x, e.y + 6 + e.rise, e.z, 22 * (0.4 + exposed * 2), 8 * (0.4 + exposed * 2), 2, 18);
    drawBoss(e);
}

// ---------------------------------------------------------------- enemy projectiles
function updateEnemyShots(dt) {
    const p = S.pl;
    for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (s.type === 1) s.vy -= 15 * dt;
        const nx = s.x + s.vx * dt,
            ny = s.y + s.vy * dt,
            nz = s.z + s.vz * dt;
        const tw = segHit(s.x, s.y, s.z, nx, ny, nz, H);
        let hitP = segSphere(s.x, s.y, s.z, nx - s.x, ny - s.y, nz - s.z, p.x, p.y + 1.25, p.z, 0.5) >= 0 || segSphere(s.x, s.y, s.z, nx - s.x, ny - s.y, nz - s.z, p.x, p.y + 0.55, p.z, 0.5) >= 0;
        if (s.type === 0) {
            if (hitP) {
                hurtPlayer(s.dmg, s.x - s.vx, s.z - s.vz);
                fxIce(nx, ny, nz, 0.8, 6);
                shots.splice(i, 1);
                continue;
            }
            if (tw >= 0 || (s.life -= dt) < 0) {
                fxIce(H.x, H.y, H.z, 0.8, 6);
                sfx.tick(H.x, H.y, H.z);
                shots.splice(i, 1);
                continue;
            }
            m4aim(B, nx, ny, nz, s.vx, s.vy, s.vz, 1);
            addInst(M.shard, B, 1, 1, 1, 0, 2.2);
            light(nx, ny, nz, 1.5, 5, 8, 4);
            sprite(0, nx, ny, nz, 0.5, 0.6, 2, 3.2, 0.7);
            if (Math.random() < dt * 40) spawn(0, nx, ny, nz, 0, 0, 0, 0.3, 0.14, 0.02, 0.6, 2, 3, 0.2, 0.6, 1.2, 0.6, 1);
        } else {
            if (tw >= 0 || hitP || (s.life -= dt) < 0) {
                const x = tw >= 0 ? H.x : nx,
                    y = tw >= 0 ? H.y : ny,
                    z = tw >= 0 ? H.z : nz;
                fxIce(x, y + 0.2, z, 2, 18);
                fxPuff(x, y, z, 2, 6);
                sfx.shatter(x, y, z, 1.4);
                spawn(4, x, y + 0.1, z, 0, 0, 0, 0.35, 0.6, 6, 2, 5, 8, 0.4, 1, 2, 0.7, 1);
                const d = Math.hypot(p.x - x, p.y + 0.8 - y, p.z - z);
                shake(clamp(0.4 * (1 - d / 16), 0, 0.4));
                if (d < 2.9) hurtPlayer(s.dmg * (1 - (d / 2.9) * 0.6), x, z);
                for (let k = 0; k < 4; k++) addDebris(M.debA, x, y + 0.3, z, rnds(5), rnd(3, 7), rnds(5), rnd(0.8, 1.4), rnd(1, 2));
                shots.splice(i, 1);
                continue;
            }
            s.rot += dt * 5;
            m4trs(B, nx, ny, nz, s.rot, s.rot * 0.7, 0, 1);
            addInst(M.boulder, B, 1, 1, 1, 0, 1.6);
            light(nx, ny, nz, 1, 3.5, 6, 5);
            // landing marker
        }
        s.x = nx;
        s.y = ny;
        s.z = nz;
    }
}

// ---------------------------------------------------------------- enemy rendering
function drawSkitter(e) {
    const mv = clamp(Math.hypot(e.vx, e.vz) / 3, 0, 1),
        bob = Math.sin(e.anim * 2) * 0.03 * mv,
        fl = Math.max(e.flash, e.burn > 0 ? 0.3 : 0);
    const crouch = e.st === 1 ? Math.min(1, e.t / 0.3) * 0.14 : 0;
    m4trs(B, e.x, e.y + 0.42 + bob + e.rise - crouch, e.z, e.yaw, e.pitch, 0, e.sc);
    addInst(M.skBody, B, 1, 1, 1, fl);
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
        addInst(M.skLeg, Tm, 1, 1, 1, fl);
        l = Math.hypot(kx - fx, ky - fy, kz - fz);
        m4aim(Lm, kx, ky, kz, kx - fx, ky - fy, kz - fz, 0.8, l / 0.42, 0.8);
        m4mul(Tm, B, Lm);
        addInst(M.skLeg, Tm, 1, 1, 1, fl);
    }
}
function drawLancer(e, ax, ay, az) {
    const fl = Math.max(e.flash, e.burn > 0 ? 0.3 : 0);
    m4trs(B, e.x, e.y + e.rise, e.z, e.yaw, 0, Math.sin(S.t * 1.3 + e.seed) * 0.08, e.sc);
    addInst(M.lnCore, B, 1, 1, 1, fl, 1 + e.charge * 4);
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
        addInst(M.lnSpike, Tm, 1, 1, 1, fl, 1 + e.charge * 3);
    }
}
function limb(mesh, x, y, z, pitch, roll, fl, s = 1) {
    m4trs(Lm, x, y, z, 0, pitch, roll, s);
    m4mul(Tm, B, Lm);
    addInst(mesh, Tm, 1, 1, 1, fl);
}
function drawBulwark(e) {
    const fl = Math.max(e.flash, e.burn > 0 ? 0.25 : 0),
        sw = Math.sin(e.anim);
    m4trs(B, e.x, e.y + 1.2 + Math.abs(Math.cos(e.anim)) * 0.05 + e.rise * 2, e.z, e.yaw, e.st === 2 ? -0.35 : 0.06, 0, e.sc);
    addInst(M.bwTorso, B, 1, 1, 1, fl);
    const raised = e.st !== 0;
    limb(M.bwArm, -0.84, 1.0, 0, raised ? e.arm : sw * 0.45, -0.14, fl);
    limb(M.bwArm, 0.84, 1.0, 0, raised ? e.arm : -sw * 0.45, 0.14, fl);
    limb(M.bwLeg, -0.25, 0, 0, -sw * 0.5, 0, fl);
    limb(M.bwLeg, 0.25, 0, 0, sw * 0.5, 0, fl);
}
function drawBoss(e) {
    const fl = e.flash * 0.6,
        sw = Math.sin(e.anim),
        kn = e.kneel || 0;
    const ex = e.st === 5 ? 1 : 0;
    m4trs(B, e.x, e.y + (3.4 - kn * 1.1 + Math.abs(Math.cos(e.anim)) * 0.12) * BS + e.rise, e.z, e.yaw, -kn * 0.25 + (e.st === 2 ? -0.25 : 0), 0, e.sc);
    addInst(M.bsTorso, B, 1, 1, 1, fl, 0.5 + ex * 3 + Math.sin(S.t * 6) * 0.2 * ex + e.charge * 1.5);
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
        addInst(M.bsNode, Tm, 1, 1, 1, n.fl || 0, 1.2 + Math.sin(S.t * 3 + i) * 0.4);
        light(H.x, H.y, H.z, 1.5 * n.sc, 5 * n.sc, 8 * n.sc, 8);
    }
}

// ---------------------------------------------------------------- pylons + heart
function updatePylons(dt) {
    for (const q of W.pylons) {
        q.hitT = Math.max(0, (q.hitT || 0) - dt * 3);
        if (!q.lit && q.hp <= 0) {
            q.lit = true;
            D.lit++;
            q.col.r = 1.3;
            for (let i = 0; i < 5; i++) fxIce(q.x + rnds(1.5), q.y + 1 + i * 1.4, q.z + rnds(1.5), 2.4, 16);
            for (let i = 0; i < 22; i++) addDebris(M.debA, q.x + rnds(1.6), q.y + rnd(0.5, 7), q.z + rnds(1.6), rnds(8), rnd(1, 9), rnds(8), rnd(1.2, 2.8), rnd(1.5, 3.5));
            sfx.shatter(q.x, q.y + 3, q.z, 1.8);
            sfx.pylon(q.x, q.y + 4, q.z);
            flash(q.x, q.y + 5, q.z, 90, 45, 14, 40, 1.2);
            shake(0.45);
            S.stamps.push(q.x, q.z, 7, 0.3, 0.5);
            S.pl.hp = Math.min(100, S.pl.hp + 40);
            hud.banner('PYLON ' + D.lit + ' / 3 REIGNITED', D.lit < 3 ? 'the frost is stirring' : 'something beneath the ice is waking');
            startWave();
        }
        if (q.lit) {
            q.thaw = Math.min(1.1, q.thaw + dt * 1.1);
            q.glow = damp(q.glow, 1, 1.5, dt);
            const fk = 0.85 + 0.15 * Math.sin(S.t * 9 + q.k) + 0.1 * Math.sin(S.t * 23 + q.k * 3);
            light(q.x, q.y + 5.2, q.z, 30 * q.glow * fk, 13 * q.glow * fk, 3.6 * q.glow, 25);
            sprite(0, q.x, q.y + 7.75, q.z, 2.6, 1.3 * q.glow * fk, 0.55 * q.glow * fk, 0.14 * q.glow, 1);
            if (Math.random() < dt * 9) spawn(2, q.x + rnds(0.5), q.y + 8, q.z + rnds(0.5), rnds(1.5), rnd(1.5, 4), rnds(1.5), rnd(0.8, 1.8), 0.02, 0.008, 12, 6, 1.5, 5, 1, 0.1, 1, 1, 0.5, 1.5, 0.02);
        } else q.thaw = (1 - Math.max(0, q.hp) / W.PYHP) * 0.42;
        m4trs(B, q.x, q.y, q.z, q.k, 0, 0, 1);
        const c = 0.3 + 0.7 * q.glow;
        addInst(M.pyCoil, B, c, c, c, 0, q.glow * (1 + 0.12 * Math.sin(S.t * 11 + q.k)));
        if (q.thaw < 1.08) addInst(M.pyIce, B, 1, 1, 1, q.hitT * 0.5, 1 + q.hitT * 3, q.thaw);
    }
    const h = W.heart;
    if (h.awake) h.diss = Math.min(1.1, (h.diss || 0) + dt * 0.45);
    if ((h.diss || 0) < 1.08) {
        m4trs(B, 0, 0.1, 0, 0.4, 0, 0, 1);
        const pulse = 0.6 + 0.4 * Math.sin(S.t * (1.2 + D.lit * 0.8));
        addInst(M.heartIce, B, 1, 1, 1, 0, 0.5 + pulse * (0.6 + D.lit * 0.9), h.diss || 0);
        light(0, 3.5, 0, 0.6 * pulse * (1 + D.lit), 2.2 * pulse * (1 + D.lit), 3.4 * pulse * (1 + D.lit), 13);
    }
}

// ---------------------------------------------------------------- director
const WAVES = [[0, 0, 0, 1, 0, 0, 1], [0, 0, 1, 0, 0, 2, 0, 1, 0, 1, 0], [0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 2, 0, 1]];
function startWave() {
    D.queue.push(...WAVES[Math.min(2, D.lit - 1)]);
    D.wave = D.lit;
    D.qt = 1.5;
}
function spawnPoint() {
    const p = S.pl;
    let best = null,
        bs = -1;
    for (let i = 0; i < 6; i++) {
        const s = W.spawns[(Math.random() * W.spawns.length) | 0],
            d = Math.hypot(s[0] - p.x, s[1] - p.z);
        const sc = d > 16 && d < 60 ? 100 - Math.abs(d - 30) + rnd(10) : rnd(5);
        if (sc > bs) {
            bs = sc;
            best = s;
        }
    }
    return best;
}
function director(dt) {
    D.t += dt;
    const alive = foes.length;
    if (D.queue.length && (D.qt -= dt) <= 0 && alive < 9 + D.lit * 2) {
        const s = spawnPoint(),
            t = D.queue.shift();
        spawnFoe(t, s[0] + rnds(2), s[1] + rnds(2));
        D.qt = rnd(0.7, 1.5);
    }
    // ambient trickle so there is always something to coat
    if (!D.queue.length && !D.won && (D.amb -= dt) <= 0) {
        const cap = D.boss ? 2 : 2 + D.lit;
        if (alive < cap) {
            const s = spawnPoint();
            spawnFoe(D.lit > 0 && Math.random() < 0.3 ? 1 : 0, s[0] + rnds(2), s[1] + rnds(2));
        }
        D.amb = D.boss ? rnd(6, 9) : rnd(3.5, 6) - D.lit * 0.6;
    }
    // finale
    if (D.lit === 3 && !D.boss && !W.heart.awake) {
        D.bossT = D.bossT < 0 ? 0 : D.bossT + dt;
        if ((!D.queue.length && alive === 0 && D.bossT > 3) || D.bossT > 40) {
            W.heart.awake = true;
            W.heart.col.off = true;
            D.boss = spawnFoe(3, 0, 0);
            D.boss.yaw = Math.atan2(-S.pl.x, -S.pl.z) + PI;
            sfx.roar(0, 4, 0);
            for (let i = 0; i < 26; i++) addDebris(M.debA, rnds(3), rnd(1, 8), rnds(3), rnds(12), rnd(3, 12), rnds(12), rnd(1.5, 3.5), rnd(2, 4));
            flash(0, 5, 0, 20, 60, 100, 50, 1.5);
            shake(0.8);
            D.queue.length = 0;
        }
    }
    if (D.won) {
        D.bossT += dt;
        const b = D.boss;
        if (D.bossT < 2.6 && Math.random() < dt * 9) {
            const x = b.x + rnds(3.5),
                y = b.y + rnd(1, 9),
                z = b.z + rnds(3.5);
            fxExplosion(x, y, z, rnd(1, 2));
            sfx.boom(x, y, z, 2);
            shake(0.3);
        }
    }
}

export function updateCombat(dt) {
    if (S.chainT > 0 && (S.chainT -= dt) <= 0) S.chain = 0;
    director(dt);
    updateShots(dt);
    updateFoes(dt);
    updateEnemyShots(dt);
    updateBlobs(dt);
    updateFires(dt);
    updatePylons(dt);
}
// title-screen / dead: keep scenery animating without game logic
export function idleCombat(dt) {
    updateBlobs(dt);
    updateFires(dt);
    updatePylons(dt);
}
