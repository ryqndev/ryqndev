import { addInstance, cam, dry, env, R } from '@ryqndev/brinewake-renderer';
import { m4inv, m4mul, m4trs } from '@ryqndev/kiln-math';

import { fxBurn, light, sprite } from '../fx';
import { M, sailMesh } from '../models';
import { PL, S } from '../state';
import { B, Lm, Tm } from './state';
import type { Ship } from './types';

const WHITE = [1, 1, 1];
/** How far off a ship's cabin lamp is still worth lighting, metres. */
const CABIN_LIT = 60;
/**
 * How far off a ship is still drawn as finely as the graphics setting asks, beyond her own length;
 * and how far off she is still given more than the coarsest of her. Metres.
 */
const FINE = 120,
    FAIR = 340;

/** Queues a ship for drawing: hull, each sail (as much of it as is set), her colours, and her lantern after dark. */
export function drawShip(s: Ship) {
    const h = s.hull,
        paint = s.paint,
        cloth = s.cloth,
        // in the yard the player's ship hangs her sails out, whatever canvas she has ordered
        set = (0.1 + 0.9 * Math.max(s.canvas, s === PL.ship ? PL.dress : 0)) * (0.45 + 0.55 * s.rig);
    m4trs(B, s.x, s.y, s.z, s.yaw, s.pitch, s.roll, s.scale);
    // The player's own ship is built whole, decks below and all, at whatever detail the graphics
    // setting asks: she is the one that is walked. Any other is a shell, and coarser the further off.
    const mine = s === PL.ship,
        range = Math.hypot(s.x - cam.x, s.z - cam.z) - s.hl,
        detail = mine || range < FINE ? R.quality : range < FAIR ? Math.min(R.quality, 1) : 0;
    addInstance(h.lod(detail, mine), B, paint[0], paint[1], paint[2], s.flash);
    const sail = sailMesh(detail);
    if (mine) {
        // the sea is kept out of her hold for as long as she swims
        dry.on = !!h.dry && !s.dead;
        if (h.dry) {
            m4inv(dry.m, B);
            dry.z0 = h.dry[0];
            dry.z1 = h.dry[1];
            dry.half = h.beam / 2;
            dry.len = h.len;
            dry.draft = h.draft;
        }
    }
    for (let i = 0; i < h.sails.length; i++) {
        const sl = h.sails[i];
        // furling draws the sail up to its yard
        m4trs(Lm, 0, sl.y, sl.z, 0, 0, 0, sl.w, sl.h * set, sl.w);
        m4mul(Tm, B, Lm);
        addInstance(sail, Tm, cloth[0], cloth[1], cloth[2], s.flash * 0.4);
        if (s.sigil) addInstance(s.sigil, Tm, s.ink[0], s.ink[1], s.ink[2], s.flash * 0.4);
    }
    // fore-and-aft sails: the unit jib's axes laid along each one, its foot shortened as it is furled to the luff
    for (let i = 0; i < h.jibs.length; i++) {
        const { tack, head, clew } = h.jibs[i],
            fz = clew[2] - tack[2],
            fy = clew[1] - tack[1];
        Lm.fill(0);
        Lm[0] = 0.11 * Math.hypot(fy, fz) * set;
        Lm[5] = head[1] - tack[1];
        Lm[6] = head[2] - tack[2];
        Lm[9] = fy * set;
        Lm[10] = fz * set;
        Lm[12] = tack[0];
        Lm[13] = tack[1];
        Lm[14] = tack[2];
        Lm[15] = 1;
        m4mul(Tm, B, Lm);
        addInstance(M.jib, Tm, cloth[0], cloth[1], cloth[2], s.flash * 0.4);
    }
    // her colours, or a white flag once she has struck them
    const flag = s.struck ? WHITE : paint;
    m4trs(Lm, 0, h.flag[1], h.flag[2], 0, 0, 0, 2.4);
    m4mul(Tm, B, Lm);
    addInstance(M.flag, Tm, flag[0], flag[1], flag[2]);
    // streamers from her other mastheads: the same bunting, drawn out long and narrow
    for (let i = 0; i < h.pennants.length; i++) {
        const p = h.pennants[i];
        m4trs(Lm, 0, p[1] + 0.2, p[2], 0, 0, 0, 1, 1.1, 5.5);
        m4mul(Tm, B, Lm);
        addInstance(M.flag, Tm, paint[0], paint[1], paint[2]);
    }
    // the lamp over her cabin table, for anyone near enough to look in: it burns by day too, down there
    if (h.cabin && !s.dead && (s.x - cam.x) ** 2 + (s.z - cam.z) ** 2 < CABIN_LIT * CABIN_LIT) {
        const [lx, ly, lz] = h.cabin.lamp;
        light(B[0] * lx + B[4] * ly + B[8] * lz + B[12], B[1] * lx + B[5] * ly + B[9] * lz + B[13], B[2] * lx + B[6] * ly + B[10] * lz + B[14], 3.4, 2.2, 0.95, 8);
    }
    // and the lanterns on the decks below: all of them for whoever is down there, and from the deck
    // above only the glow up her hatch
    if (mine && !s.dead && h.tweens.length) {
        const down = PL.me.tier > 0 || PL.me.flight >= 0;
        for (let i = 0; i < (down ? h.tweens.length : 1); i++)
            for (const [lx, ly, lz] of h.tweens[i].lamps) light(B[0] * lx + B[4] * ly + B[8] * lz + B[12], B[1] * lx + B[5] * ly + B[9] * lz + B[13], B[2] * lx + B[6] * ly + B[10] * lz + B[14], 3, 1.95, 0.85, down ? 8.5 : 3.2);
    }
    if (env.lamp > 0.05 && !s.dead) {
        const [lx, ly, lz] = h.lantern,
            x = B[0] * lx + B[4] * ly + B[8] * lz + B[12],
            y = B[1] * lx + B[5] * ly + B[9] * lz + B[13],
            z = B[2] * lx + B[6] * ly + B[10] * lz + B[14];
        sprite(0, x, y, z, 1.1 * env.lamp, 2.2, 1.3, 0.5, 0.8);
        light(x, y + 0.5, z, 7 * env.lamp, 4.2 * env.lamp, 1.7 * env.lamp, 22);
    }
}

/**
 * Fire on a ship that has taken a beating: the worse her state, the more of her deck is alight.
 * Returns how brightly she burns, for the crackle in the sound bed.
 */
export function burnShip(s: Ship, dt: number): number {
    const hurt = s.dead ? Math.max(0, 0.9 - s.sink * 0.22) : 1 - s.hp / (s.max * 0.5);
    if (hurt <= 0) return 0;
    const c = Math.cos(s.yaw),
        sn = Math.sin(s.yaw);
    // two or three seats of fire at fixed places along the deck
    const fires = hurt > 0.6 ? 3 : hurt > 0.3 ? 2 : 1;
    for (let i = 0; i < fires; i++) {
        const lz = Math.sin(s.seed * (i + 1) * 1.7) * s.hl * 0.6,
            lx = Math.cos(s.seed * (i + 2) * 2.3) * s.hb * 0.4,
            x = s.x + c * lx + sn * lz,
            z = s.z - sn * lx + c * lz,
            y = s.y + s.hull.deck * s.scale;
        if (Math.random() < dt * (10 + 22 * hurt)) fxBurn(x, y, z, 0.8 + hurt);
        if (i === 0) light(x, y + 2, z, 16 * hurt, 7 * hurt, 1.6 * hurt, 30 * (0.85 + 0.15 * Math.sin(S.t * 17 + s.seed)));
    }
    return hurt;
}
