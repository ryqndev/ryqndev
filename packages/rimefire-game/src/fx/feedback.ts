import { S } from '../state';

const SHOCKWAVE_LIFE = 0.55;

/** Adds camera shake (0..1). */
export function shake(a: number) {
    S.trauma = Math.min(1, S.trauma + a);
}
/** Screen-space ripple centred on a world position. */
export function shockwave(x: number, y: number, z: number, str: number) {
    if (S.sw.length >= 4) S.sw.shift();
    S.sw.push({ x, y, z, t: 0, str });
}


/** Ages the active shockwaves; the renderer only draws them. */
export function updateShockwaves(dt: number) {
    for (let i = S.sw.length - 1; i >= 0; i--) {
        const s = S.sw[i];
        s.t += dt;
        if (s.t > SHOCKWAVE_LIFE) S.sw.splice(i, 1);
    }
}
