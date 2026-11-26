import { smooth, TAU } from '@ryqndev/rimefire-math';

/**
 * The lighting state every shader reads: one directional light (the sun, or the moon at night),
 * the sky gradient it sits in and the colour of the sea. setDayPhase() fills it in.
 */
export interface Environment {
    /** unit vector toward the light */
    sun: Float32Array;
    /** linear HDR colour of the direct light */
    sunCol: Float32Array;
    zenith: Float32Array;
    horizon: Float32Array;
    /** deep-water body colour and the colour of shallows / light passing through crests */
    deep: Float32Array;
    shallow: Float32Array;
    fogDensity: number;
    exposure: number;
    /** 0 by day .. 1 at night: how strongly lanterns and windows glow */
    lamp: number;
    /** 0..1 star visibility */
    stars: number;
    /** 0..1 overall brightness of sun-lit, unlit-shaded things (smoke, spray) */
    day: number;
}

export const env: Environment = {
    sun: new Float32Array([0.5, 0.6, 0.6]),
    sunCol: new Float32Array(3),
    zenith: new Float32Array(3),
    horizon: new Float32Array(3),
    deep: new Float32Array(3),
    shallow: new Float32Array(3),
    fogDensity: 0.0012,
    exposure: 1,
    lamp: 0,
    stars: 0,
    day: 1,
};

interface Key {
    sun: number[];
    zenith: number[];
    horizon: number[];
    deep: number[];
    shallow: number[];
    fog: number;
    exposure: number;
    lamp: number;
    stars: number;
    day: number;
}

// dawn, noon, dusk, midnight: the phase runs 0..1 through them and wraps
const KEYS: Key[] = [
    { sun: [2.2, 1.25, 0.62], zenith: [0.13, 0.24, 0.5], horizon: [0.78, 0.5, 0.36], deep: [0.012, 0.065, 0.105], shallow: [0.08, 0.27, 0.27], fog: 0.0011, exposure: 1, lamp: 0.2, stars: 0.1, day: 0.72 },
    { sun: [1.9, 1.76, 1.52], zenith: [0.075, 0.24, 0.66], horizon: [0.4, 0.58, 0.8], deep: [0.008, 0.075, 0.15], shallow: [0.05, 0.36, 0.35], fog: 0.0007, exposure: 1, lamp: 0, stars: 0, day: 1 },
    { sun: [2.3, 1, 0.4], zenith: [0.11, 0.14, 0.38], horizon: [0.92, 0.42, 0.2], deep: [0.014, 0.045, 0.09], shallow: [0.09, 0.2, 0.22], fog: 0.0011, exposure: 1, lamp: 0.65, stars: 0.25, day: 0.6 },
    { sun: [0.14, 0.21, 0.36], zenith: [0.004, 0.009, 0.026], horizon: [0.018, 0.036, 0.075], deep: [0.002, 0.008, 0.02], shallow: [0.008, 0.032, 0.046], fog: 0.001, exposure: 1.9, lamp: 1, stars: 1, day: 0.16 },
];

const mix3 = (out: Float32Array, a: number[], b: number[], t: number, k = 1) => {
    for (let i = 0; i < 3; i++) out[i] = (a[i] + (b[i] - a[i]) * t) * k;
};

/**
 * Sets the time of day. Phase 0 is sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight. The single
 * directional light is the sun for the first half and the moon for the second; it dims to nothing
 * at the horizon, so the hand-over between the two is never visible.
 */
export function setDayPhase(phase: number) {
    const p = phase - Math.floor(phase),
        f = p * 4,
        i = Math.floor(f) % 4,
        t = smooth(0, 1, f - Math.floor(f)),
        a = KEYS[i],
        b = KEYS[(i + 1) % 4];
    const lift = Math.sin(p * TAU),
        night = lift < 0,
        el = Math.abs(lift) * (night ? 0.8 : 1.05),
        az = 0.7 + p * 2.4 + (night ? Math.PI : 0);
    env.sun[0] = Math.cos(el) * Math.cos(az);
    env.sun[1] = Math.sin(el);
    env.sun[2] = Math.cos(el) * Math.sin(az);
    mix3(env.sunCol, a.sun, b.sun, t, smooth(0.01, 0.2, Math.abs(lift)));
    mix3(env.zenith, a.zenith, b.zenith, t);
    mix3(env.horizon, a.horizon, b.horizon, t);
    mix3(env.deep, a.deep, b.deep, t);
    mix3(env.shallow, a.shallow, b.shallow, t);
    env.fogDensity = a.fog + (b.fog - a.fog) * t;
    env.exposure = a.exposure + (b.exposure - a.exposure) * t;
    // squared: lamps stay dark until the light has really gone
    env.lamp = (a.lamp + (b.lamp - a.lamp) * t) ** 2;
    env.stars = a.stars + (b.stars - a.stars) * t;
    env.day = a.day + (b.day - a.day) * t;
}
