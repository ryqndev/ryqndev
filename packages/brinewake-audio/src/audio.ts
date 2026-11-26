// Everything you hear is synthesised at runtime with WebAudio. No samples.
import { ac, AU, bed, distanceTo, drive, limit, music, noise, out, rp, startAudio, tone } from '@ryqndev/kiln-audio';

export { AU, setListener, setVolume, suspendAudio } from '@ryqndev/kiln-audio';

let seaG!: GainNode, seaF!: BiquadFilterNode, windG!: GainNode, windF!: BiquadFilterNode, fireG!: GainNode;

/** Starts the audio, or resumes it. Call from a user gesture. */
export function initAudio() {
    // open-air tail: a short, bright decay
    startAudio({ release: 0.2, reverb: { seconds: 1.8, decay: 3.4, fadeIn: 300, level: 0.4 }, musicWet: 0.25, range: 60, panFrom: 2 }, () => {
        // looping noise beds: the sea, the wind in the rigging, burning timber
        [seaG, seaF] = bed('lowpass', 500, 0.3, 0.06);
        [windG, windF] = bed('bandpass', 700, 0.8, 0.02);
        fireG = bed('bandpass', 1400, 0.7, 0)[0];
    });
}

/** Guns nearer than this are heard the moment they flash, metres: the player's own broadside. */
const INSTANT = 50;
const SOUND_SPEED = 340;

export const sfx = {
    /**
     * A gun going off at a point in the world. Black powder burns instead of detonating, so the
     * report is a heavy low boom and a long roll over the water, with no crack to it. Distance
     * dulls it further and makes it arrive after the flash.
     */
    cannon(x: number, y: number, z: number, heft = 1) {
        if (!ac || limit('cannon', 28)) return;
        const d = out(x, y, z, 0.75 * Math.min(1.25, Math.sqrt(heft)), 0.55, 110);
        if (!d) return;
        const far = distanceTo(x, y, z),
            t = ac.currentTime + Math.min(1, Math.max(0, far - INSTANT) / SOUND_SPEED),
            // a heavier gun speaks lower
            p = rp(0.12) / Math.sqrt(heft);
        // nothing bright gets out, and air soaks up what top there is with distance
        const air = ac.createBiquadFilter();
        air.type = 'lowpass';
        air.frequency.value = Math.max(250, 2200 / (1 + (far / 70) ** 2));
        air.connect(d);
        // All three layers are noise, on purpose: a pitched tone gliding down reads as a kick drum.
        // the thump: the muzzle blast, already dull
        noise(drive(air, 0.5), t, 0.35, 'lowpass', 700 * p, 90, 0.6, 6, 0.004);
        // the boom: the lowest band of the noise, driven flat so every shot lands with the same weight
        noise(drive(air, 0.7), t, 1.6, 'lowpass', 110 * p, 45, 1, 25, 0.008);
        // the roll: the report rumbling away across the water
        noise(air, t + 0.03, 4.5, 'lowpass', 350 * p, 50, 0.5, 3, 0.05);
    },
    /** A ball landing in the sea. */
    splash(x: number, y: number, z: number) {
        if (!ac || limit('splash', 45)) return;
        const d = out(x, y, z, 0.42, 0.2, 70);
        if (!d) return;
        const t = ac.currentTime,
            p = rp(0.2);
        noise(d, t, 0.5, 'bandpass', 2100 * p, 500, 0.7, 0.5, 0.02);
        tone(d, t, 0.16, 'sine', 190 * p, 60, 0.3);
    },
    /** A ball striking timber. */
    hit(x: number, y: number, z: number) {
        if (!ac || limit('hit', 35)) return;
        const d = out(x, y, z, 0.7, 0.3, 90);
        if (!d) return;
        const t = ac.currentTime,
            p = rp(0.18);
        noise(d, t, 0.16, 'bandpass', 1500 * p, 420, 1.4, 0.8);
        tone(d, t, 0.13, 'triangle', 240 * p, 70, 0.6);
        noise(d, t + 0.02, 0.3, 'highpass', 3800, 2200, 0.5, 0.16, 0.01);
    },
    /** The player's own hull taking a hit: felt more than heard. */
    hurt() {
        if (!ac || limit('hurt', 70)) return;
        const d = out(null, 0, 0, 0.6, 0.1),
            t = ac.currentTime;
        tone(d, t, 0.26, 'sine', 110, 36, 0.9);
        noise(d, t, 0.2, 'lowpass', 900, 160, 0.8, 0.5);
    },
    /** A ship breaking up and going down. */
    sink(x: number, y: number, z: number) {
        if (!ac) return;
        const d = out(x, y, z, 1, 0.5, 140);
        if (!d) return;
        const t = ac.currentTime;
        tone(d, t, 0.7, 'sine', 95, 26, 1);
        noise(d, t, 1.4, 'lowpass', 3200, 110, 0.5, 0.9);
        // timbers groaning as she settles
        for (let i = 0; i < 4; i++) tone(d, t + 0.5 + i * 0.55, 0.5, 'sawtooth', 70 * rp(0.3), 46 * rp(0.2), 0.12, 0.12);
        noise(d, t + 0.8, 3.2, 'bandpass', 1400, 300, 0.6, 0.25, 0.6);
    },
    /** Plunder hauled aboard. */
    coin() {
        if (!ac || limit('coin', 55)) return;
        const d = out(null, 0, 0, 0.3, 0.25),
            t = ac.currentTime,
            p = rp(0.05);
        tone(d, t, 0.22, 'sine', 1320 * p, 1320 * p, 0.5);
        tone(d, t + 0.06, 0.3, 'sine', 1980 * p, 1980 * p, 0.4);
    },
    /** Canvas being let out or taken in. */
    sail(up: boolean) {
        if (!ac) return;
        const d = out(null, 0, 0, 0.3, 0.15),
            t = ac.currentTime;
        noise(d, t, 0.45, 'bandpass', up ? 500 : 1400, up ? 1500 : 450, 0.9, 0.5, 0.08);
    },
    /** Harbour bell: docking and banking. */
    bell() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.35, 0.6),
            t = ac.currentTime;
        for (const [f, g] of [[620, 0.5], [1240, 0.2], [1853, 0.14], [2480, 0.07]]) tone(d, t, 2.2, 'sine', f, f * 0.995, g, 0.002);
        noise(d, t, 0.03, 'highpass', 4000, 3000, 0.7, 0.2, 0.001);
    },
    ui() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.25, 0.1),
            t = ac.currentTime;
        tone(d, t, 0.07, 'triangle', 520, 780, 0.5);
    },
    /** A purchase at the shipyard. */
    buy() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.35, 0.3),
            t = ac.currentTime;
        noise(d, t, 0.12, 'bandpass', 900, 500, 1.2, 0.5);
        tone(d, t, 0.1, 'triangle', 200, 120, 0.5);
        [660, 880, 1320].forEach((f, i) => tone(d, t + 0.08 + i * 0.07, 0.25, 'sine', f, f, 0.25));
    },
    deny() {
        if (!ac || limit('deny', 120)) return;
        const d = out(null, 0, 0, 0.25, 0.05),
            t = ac.currentTime;
        tone(d, t, 0.16, 'square', 150, 110, 0.3);
    },
    /** A new threat on the horizon. */
    horn() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.4, 0.7),
            t = ac.currentTime;
        for (const f of [98, 147, 196.5]) tone(d, t, 2.4, 'sawtooth', f, f, 0.16, 0.5);
    },
    win() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.5, 0.8),
            t = ac.currentTime;
        [146.8, 220, 293.7, 370, 440, 587.3].forEach((f, i) => {
            tone(d, t + i * 0.16, 3.5, 'sawtooth', f, f, 0.1, 0.3);
            tone(d, t + i * 0.16, 3.5, 'sine', f * 2, f * 2, 0.08, 0.3);
        });
    },
};

// ---- adaptive bed: surf and wind that follow the ship's speed, and war drums that close in with danger ----
let beat = 0,
    nextT = 0,
    wt = 0;
// semitones above the root, one bar of sixteenths; 0 entries still sound the root
const SEQ = [0, 0, 7, 0, 3, 0, 7, 5, 0, 0, 7, 0, 10, 7, 5, 3];
/**
 * Call once per frame. `speed` is 0..1 of the ship's top speed, `fire` how much is burning nearby,
 * `intensity` 0..1+ how hard the fight is.
 */
export function audioTick(dt: number, speed: number, fire: number, intensity: number) {
    if (!ac) return;
    const t = ac.currentTime;
    AU.intensity += (intensity - AU.intensity) * Math.min(1, dt * 1.2);
    const I = AU.intensity;
    wt += dt;
    const swell = 0.5 + 0.5 * Math.sin(wt * 0.9) * Math.sin(wt * 0.37 + 1);
    seaG.gain.setTargetAtTime(0.035 + 0.03 * swell + 0.05 * speed, t, 0.3);
    seaF.frequency.setTargetAtTime(380 + 500 * swell + 900 * speed, t, 0.4);
    windG.gain.setTargetAtTime(0.008 + 0.02 * speed + 0.008 * Math.sin(wt * 0.23), t, 0.5);
    windF.frequency.setTargetAtTime(600 + 260 * Math.sin(wt * 0.17) + 300 * speed, t, 0.5);
    fireG.gain.setTargetAtTime(Math.min(0.16, fire * 0.05) * (0.6 + 0.8 * Math.random()), t, 0.04);
    const step = 0.26 * (1 - 0.12 * Math.min(1, I));
    if (nextT < t) nextT = t + 0.05;
    while (nextT < t + 0.15) {
        if (I > 0.12) {
            const f = 49 * Math.pow(2, SEQ[beat % 16] / 12);
            const fl = ac.createBiquadFilter();
            fl.type = 'lowpass';
            fl.Q.value = 4;
            fl.frequency.setValueAtTime(160 + 1100 * I * I, nextT);
            fl.frequency.exponentialRampToValueAtTime(100, nextT + step * 0.9);
            fl.connect(music);
            tone(fl, nextT, step * 0.95, 'sawtooth', f, f, 0.16 * Math.min(1, I), 0.004);
            // drums: a low tom on the beat, a higher one answering, a rattle once things are desperate
            if (beat % 4 === 0) tone(music, nextT, 0.22, 'sine', 105, 42, 0.34 * Math.min(1, I), 0.002);
            if (I > 0.4 && beat % 8 === 6) tone(music, nextT, 0.16, 'sine', 170, 80, 0.2 * I, 0.002);
            if (I > 0.7 && beat % 2 === 1) noise(music, nextT, 0.05, 'bandpass', 2400, 1600, 1.4, 0.06 * I, 0.001);
        }
        beat++;
        nextT += step;
    }
}
