// Everything you hear is synthesised at runtime with WebAudio. No samples.
import { clamp } from '@ryqndev/rimefire-math';

let ac: AudioContext | null = null;
// non-null alias for the helpers that only ever run after initAudio()
let ctx!: AudioContext;
let master!: GainNode, rev!: ConvolverNode, nbuf!: AudioBuffer, seaG!: GainNode, seaF!: BiquadFilterNode, windG!: GainNode, windF!: BiquadFilterNode, fireG!: GainNode, musG!: GainNode;
const L = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
const last: Record<string, number> = {};
export const AU = { vol: 0.8, intensity: 0, ready: false };

export function initAudio() {
    if (ac) {
        ac.resume();
        return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ac = ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = AU.vol;
    master.connect(comp);
    comp.connect(ctx.destination);
    // open-air tail: a short, bright decay
    const sr = ctx.sampleRate,
        len = (sr * 1.8) | 0,
        ir = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4) * (i < 300 ? i / 300 : 1);
    }
    rev = ctx.createConvolver();
    rev.buffer = ir;
    const rg = ctx.createGain();
    rg.gain.value = 0.4;
    rev.connect(rg);
    rg.connect(master);
    nbuf = ctx.createBuffer(1, sr * 2, sr);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // looping noise beds: the sea, the wind in the rigging, burning timber
    const loop = (type: BiquadFilterType, f: number, q: number, g: number): [GainNode, BiquadFilterNode] => {
        const s = ctx.createBufferSource();
        s.buffer = nbuf;
        s.loop = true;
        const fl = ctx.createBiquadFilter();
        fl.type = type;
        fl.frequency.value = f;
        fl.Q.value = q;
        const gn = ctx.createGain();
        gn.gain.value = g;
        s.connect(fl);
        fl.connect(gn);
        gn.connect(master);
        s.start(0, Math.random());
        return [gn, fl];
    };
    [seaG, seaF] = loop('lowpass', 500, 0.3, 0.06);
    [windG, windF] = loop('bandpass', 700, 0.8, 0.02);
    fireG = loop('bandpass', 1400, 0.7, 0)[0];
    musG = ctx.createGain();
    musG.gain.value = 0.5;
    musG.connect(master);
    const mw = ctx.createGain();
    mw.gain.value = 0.25;
    musG.connect(mw);
    mw.connect(rev);
    AU.ready = true;
}
/** Where sounds are heard from: a position and the listener's right-hand direction. */
export function setListener(x: number, y: number, z: number, rx: number, rz: number) {
    L.x = x;
    L.y = y;
    L.z = z;
    L.rx = rx;
    L.rz = rz;
}
export function setVolume(v: number) {
    AU.vol = v;
    if (master) master.gain.value = v;
}
export function suspendAudio(s: boolean) {
    if (!ac) return;
    if (s) ac.suspend();
    else ac.resume();
}

// rate limiter so a burst of identical events does not stack into one loud click
function limit(key: string, ms: number) {
    const n = performance.now();
    if (n - (last[key] || 0) < ms) return true;
    last[key] = n;
    return false;
}
// output chain for a sound: positioned when x is given, otherwise centred. Null if it would be inaudible.
function out(x: null, y: number, z: number, gain: number, wet?: number, range?: number): GainNode;
function out(x: number, y: number, z: number, gain: number, wet?: number, range?: number): GainNode | null;
function out(x: number | null, y: number, z: number, gain: number, wet = 0.3, range = 60): GainNode | null {
    let pan = 0,
        g = gain;
    if (x !== null) {
        const dx = x - L.x,
            dy = y - L.y,
            dz = z - L.z,
            d = Math.hypot(dx, dy, dz);
        g = gain / (1 + (d / range) * (d / range));
        if (g < 0.004) return null;
        pan = d > 2 ? clamp(((dx * L.rx + dz * L.rz) / d) * 0.85, -1, 1) : 0;
    }
    const gn = ctx.createGain();
    gn.gain.value = g;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    gn.connect(p);
    p.connect(master);
    if (wet) {
        const w = ctx.createGain();
        w.gain.value = wet;
        p.connect(w);
        w.connect(rev);
    }
    return gn;
}
function noise(dst: AudioNode, t0: number, dur: number, type: BiquadFilterType, f0: number, f1: number, q: number, g0: number, att = 0.003) {
    const s = ctx.createBufferSource();
    s.buffer = nbuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(g0, t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dst);
    s.start(t0, Math.random() * 1.6);
    s.stop(t0 + dur + 0.05);
}
function tone(dst: AudioNode, t0: number, dur: number, type: OscillatorType, f0: number, f1: number, g0: number, att = 0.003) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(g0, t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dst);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
}
const rp = (a = 0.08) => 1 + (Math.random() * 2 - 1) * a;

export const sfx = {
    /** A gun going off at a point in the world. */
    cannon(x: number, y: number, z: number) {
        if (!ac || limit('cannon', 28)) return;
        const d = out(x, y, z, 0.9, 0.45, 110);
        if (!d) return;
        const t = ac.currentTime,
            p = rp(0.14);
        tone(d, t, 0.34, 'sine', 150 * p, 34, 0.95);
        noise(d, t, 0.42, 'lowpass', 2600 * p, 160, 0.6, 0.8);
        noise(d, t + 0.03, 0.9, 'lowpass', 500, 90, 0.4, 0.3, 0.05);
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
            fl.connect(musG);
            tone(fl, nextT, step * 0.95, 'sawtooth', f, f, 0.16 * Math.min(1, I), 0.004);
            // drums: a low tom on the beat, a higher one answering, a rattle once things are desperate
            if (beat % 4 === 0) tone(musG, nextT, 0.22, 'sine', 105, 42, 0.34 * Math.min(1, I), 0.002);
            if (I > 0.4 && beat % 8 === 6) tone(musG, nextT, 0.16, 'sine', 170, 80, 0.2 * I, 0.002);
            if (I > 0.7 && beat % 2 === 1) noise(musG, nextT, 0.05, 'bandpass', 2400, 1600, 1.4, 0.06 * I, 0.001);
        }
        beat++;
        nextT += step;
    }
}
