import { smooth, TAU } from '@ryqndev/rimefire-math';

// The swell: four Gerstner waves as [direction x, direction z, wavelength, amplitude], in metres.
// The water shader and the simulation both read them from here, so hulls ride the surface that is drawn.
const SWELL = [
    [0.86, 0.51, 67, 0.62],
    [0.53, 0.85, 39, 0.33],
    [0.98, -0.2, 23, 0.19],
    [0.29, 0.957, 13, 0.09],
];
/** How far a crest pulls the surface sideways, as a fraction of the wave's amplitude. */
const CHOP = 0.85;
export const WAVE_COUNT = SWELL.length;

/** Per wave: wavenumber vector xz, angular frequency, amplitude. */
export const waveA = new Float32Array(WAVE_COUNT * 4);
/** Per wave: sideways reach xz, 1 / wavelength, unused. */
export const waveB = new Float32Array(WAVE_COUNT * 4);
SWELL.forEach(([dx, dz, length, amp], i) => {
    const l = Math.hypot(dx, dz),
        k = TAU / length;
    waveA.set([(dx / l) * k, (dz / l) * k, Math.sqrt(9.8 * k), amp], i * 4);
    waveB.set([(dx / l) * amp * CHOP, (dz / l) * amp * CHOP, 1 / length, 0], i * 4);
});

/** Waves flatten out over shallows. `ground` is the terrain height there (negative under water). */
export const shoreCalm = (ground: number) => 0.15 + 0.85 * smooth(0.5, 9, -ground);

/** Height of the open sea at a point: the same surface the water shader displaces. */
export function seaHeight(x: number, z: number, t: number): number {
    // the shader moves vertices sideways as well as up; step back by that offset once to find
    // which part of the wave ends up over (x, z)
    let ox = 0,
        oz = 0;
    for (let i = 0; i < waveA.length; i += 4) {
        const c = Math.cos(waveA[i] * x + waveA[i + 1] * z - waveA[i + 2] * t);
        ox += waveB[i] * c;
        oz += waveB[i + 1] * c;
    }
    x -= ox;
    z -= oz;
    let y = 0;
    for (let i = 0; i < waveA.length; i += 4) y += waveA[i + 3] * Math.sin(waveA[i] * x + waveA[i + 1] * z - waveA[i + 2] * t);
    return y;
}
