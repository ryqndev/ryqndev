// A ship's deck as somewhere to stand: points of the world in her own frame and back again, how
// high her deck is and how far it runs at each point of her length, and where that puts someone in
// the world while she pitches and rolls. Shared by everyone who walks one (afoot.ts, gunner.ts) and
// everyone drawn on one (mates.ts).
import { clamp, m4, m4trs } from '@ryqndev/kiln-math';

import type { Cabin, Tween } from './models';
import type { Ship } from './ships';

// a point of the world in a ship's own frame, on the level: x to starboard, z aft
const local = { x: 0, z: 0 };
export function toShip(s: Ship, x: number, z: number) {
    const c = Math.cos(s.yaw),
        sn = Math.sin(s.yaw),
        dx = x - s.x,
        dz = z - s.z;
    local.x = c * dx - sn * dz;
    local.z = sn * dx + c * dz;
    return local;
}
// and back again
const world = { x: 0, z: 0 };
export function fromShip(s: Ship, lx: number, lz: number) {
    const c = Math.cos(s.yaw),
        sn = Math.sin(s.yaw);
    world.x = s.x + c * lx + sn * lz;
    world.z = s.z - sn * lx + c * lz;
    return world;
}

/**
 * The deck of a ship at a point of her own frame, as deckAt() last found it: its height and how far
 * it runs either side of her centreline, both in the hull's own metres.
 */
export const deck = { y: 0, w: 0 };
/** How far either side of her centreline a cabin's floor runs at a point of its length, both in the hull's own metres. */
export function cabinWidth(c: Cabin, z: number) {
    const n = c.w.length - 1,
        f = clamp((z - c.z0) / (c.z1 - c.z0), 0, 1) * n,
        i = Math.min(n - 1, Math.floor(f));
    return c.w[i] + (c.w[i + 1] - c.w[i]) * (f - i);
}

/** How far either side of her centreline a deck below runs at a point of its length, both in the hull's own metres. */
export function tweenWidth(t: Tween, z: number) {
    const n = t.w.length - 1,
        f = clamp((z - t.z0) / (t.z1 - t.z0), 0, 1) * n,
        i = Math.min(n - 1, Math.floor(f));
    return t.w[i] + (t.w[i + 1] - t.w[i]) * (f - i);
}

/**
 * Finds her deck at `lz`. False where she has none; `clamped` takes the nearest deck there is beyond
 * her ends instead. For someone `below`, in the cabin under her quarterdeck, it is the cabin's floor
 * that is found, not the deck over their head; and for someone on a `tier` under her weather deck
 * (1 the first deck down), that deck.
 */
export function deckAt(s: Ship, lz: number, clamped = false, below = false, tier = 0): boolean {
    const h = s.hull,
        z = lz / s.scale;
    if (tier > 0 && h.tweens[tier - 1]) {
        deck.y = h.tweens[tier - 1].y;
        deck.w = tweenWidth(h.tweens[tier - 1], z);
        return true;
    }
    if (below && h.cabin) {
        deck.y = h.cabin.y;
        deck.w = cabinWidth(h.cabin, z);
        return true;
    }
    const k = h.walk,
        n = k.y.length - 1,
        f = (((h.len / 2 - z) / h.len - k.t0) / (k.t1 - k.t0)) * n;
    if (!clamped && (f < 0 || f > n)) return false;
    const i = clamp(Math.floor(f), 0, n - 1),
        u = clamp(f - i, 0, 1);
    deck.y = k.y[i] + (k.y[i + 1] - k.y[i]) * u;
    deck.w = k.w[i] + (k.w[i + 1] - k.w[i]) * u;
    // a deck raised over her open one is level, and ends square: there is no slope up to it
    for (const r of k.raised) if (z >= r.z0 && z <= r.z1 && r.y > deck.y) deck.y = r.y;
    return true;
}

const Sm = m4();
/** Takes a ship's attitude as it is this instant, for afloat() to work from. Returns her matrix: it is only good until the next call. */
export function trim(s: Ship) {
    return m4trs(Sm, s.x, s.y, s.z, s.yaw, s.pitch, s.roll, s.scale);
}
/** How high a point of the ship last trimmed is in the world: (lx, lz) in her frame and world metres, `y` in her hull's own. */
export const afloat = (s: Ship, lx: number, y: number, lz: number) => (Sm[1] * lx + Sm[9] * lz) / s.scale + Sm[5] * y + Sm[13];
