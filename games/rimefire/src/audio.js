// Everything you hear is synthesised at runtime with WebAudio. No samples.
import { clamp } from './math.js';

let ac = null,
    master,
    rev,
    nbuf,
    fireG,
    windG,
    windF,
    musG,
    droneG;
const L = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
const last = {};
export const AU = { vol: 0.8, intensity: 0, ready: false };

export function initAudio() {
    if (ac) {
        ac.resume();
        return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    master = ac.createGain();
    master.gain.value = AU.vol;
    master.connect(comp);
    comp.connect(ac.destination);
    const sr = ac.sampleRate,
        len = (sr * 2.6) | 0,
        ir = ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8) * (i < 400 ? i / 400 : 1);
    }
    rev = ac.createConvolver();
    rev.buffer = ir;
    const rg = ac.createGain();
    rg.gain.value = 0.55;
    rev.connect(rg);
    rg.connect(master);
    nbuf = ac.createBuffer(1, sr * 2, sr);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // wind bed
    const loop = (type, f, q, g) => {
        const s = ac.createBufferSource();
        s.buffer = nbuf;
        s.loop = true;
        const fl = ac.createBiquadFilter();
        fl.type = type;
        fl.frequency.value = f;
        fl.Q.value = q;
        const gn = ac.createGain();
        gn.gain.value = g;
        s.connect(fl);
        fl.connect(gn);
        gn.connect(master);
        s.start();
        return [gn, fl];
    };
    [windG, windF] = loop('bandpass', 320, 0.5, 0.05);
    fireG = loop('bandpass', 1500, 0.7, 0)[0];
    // drone
    droneG = ac.createGain();
    droneG.gain.value = 0.0;
    const df = ac.createBiquadFilter();
    df.type = 'lowpass';
    df.frequency.value = 150;
    for (const f of [55, 55.35, 82.6]) {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(df);
        o.start();
    }
    df.connect(droneG);
    droneG.connect(master);
    musG = ac.createGain();
    musG.gain.value = 0.5;
    musG.connect(master);
    const mw = ac.createGain();
    mw.gain.value = 0.3;
    musG.connect(mw);
    mw.connect(rev);
    AU.ready = true;
}
export function setListener(x, y, z, rx, rz) {
    L.x = x;
    L.y = y;
    L.z = z;
    L.rx = rx;
    L.rz = rz;
}
export function setVolume(v) {
    AU.vol = v;
    if (master) master.gain.value = v;
}
export function suspendAudio(s) {
    if (ac) s ? ac.suspend() : ac.resume();
}

function limit(key, ms) {
    const n = performance.now();
    if (n - (last[key] || 0) < ms) return true;
    last[key] = n;
    return false;
}
// output chain for a positioned sound. returns [node, t0] or null if inaudible
function out(x, y, z, gain, wet = 0.3, range = 9) {
    let pan = 0,
        g = gain;
    if (x !== undefined && x !== null) {
        const dx = x - L.x,
            dy = y - L.y,
            dz = z - L.z,
            d = Math.hypot(dx, dy, dz);
        g = gain / (1 + (d / range) * (d / range));
        if (g < 0.004) return null;
        pan = d > 0.5 ? clamp(((dx * L.rx + dz * L.rz) / d) * 0.85, -1, 1) : 0;
    }
    const gn = ac.createGain();
    gn.gain.value = g;
    const p = ac.createStereoPanner();
    p.pan.value = pan;
    gn.connect(p);
    p.connect(master);
    if (wet) {
        const w = ac.createGain();
        w.gain.value = wet;
        p.connect(w);
        w.connect(rev);
    }
    return gn;
}
function noise(dst, t0, dur, type, f0, f1, q, g0, att = 0.003) {
    const s = ac.createBufferSource();
    s.buffer = nbuf;
    s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(g0, t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dst);
    s.start(t0, Math.random() * 1.6);
    s.stop(t0 + dur + 0.05);
}
function tone(dst, t0, dur, type, f0, f1, g0, att = 0.003) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t0 + dur);
    const g = ac.createGain();
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
    gel() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.5, 0.08),
            t = ac.currentTime,
            p = rp(0.12);
        tone(d, t, 0.13, 'sine', 300 * p, 85 * p, 0.55);
        noise(d, t, 0.09, 'bandpass', 1100 * p, 380, 1.6, 0.4);
        tone(d, t + 0.02, 0.06, 'triangle', 620 * p, 240, 0.12);
    },
    splat(x, y, z) {
        if (!ac || limit('splat', 35)) return;
        const d = out(x, y, z, 0.5, 0.15, 7);
        if (!d) return;
        const t = ac.currentTime,
            p = rp(0.2);
        noise(d, t, 0.1, 'lowpass', 1500 * p, 260, 2, 0.5);
        tone(d, t, 0.09, 'sine', 210 * p, 70, 0.4);
    },
    spark() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.6, 0.22),
            t = ac.currentTime,
            p = rp(0.05);
        noise(d, t, 0.06, 'highpass', 2600, 5200, 0.7, 0.75, 0.001);
        tone(d, t, 0.08, 'square', 940 * p, 170, 0.22, 0.001);
        tone(d, t, 0.14, 'sine', 170, 48, 0.75, 0.001);
        noise(d, t + 0.03, 0.26, 'bandpass', 3800, 1400, 1.2, 0.12);
    },
    tick(x, y, z) {
        if (!ac || limit('tick', 30)) return;
        const d = out(x, y, z, 0.4, 0.3, 10);
        if (!d) return;
        const t = ac.currentTime;
        noise(d, t, 0.05, 'highpass', 3500, 7000, 0.8, 0.5, 0.001);
        tone(d, t, 0.05, 'triangle', 2400 * rp(0.2), 900, 0.18, 0.001);
    },
    ignite(x, y, z) {
        if (!ac || limit('ign', 45)) return;
        const d = out(x, y, z, 0.5, 0.3, 12);
        if (!d) return;
        const t = ac.currentTime;
        noise(d, t, 0.26, 'bandpass', 350, 2600, 1.1, 0.5, 0.05);
    },
    boom(x, y, z, s = 1) {
        if (!ac || limit('boom', 38)) return;
        const d = out(x, y, z, 1.1 * Math.min(1.5, 0.7 + 0.3 * s), 0.6, 22);
        if (!d) return;
        const t = ac.currentTime,
            p = rp(0.15);
        const ws = ac.createWaveShaper(),
            c = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const v = i / 128 - 1;
            c[i] = Math.tanh(v * 3);
        }
        ws.curve = c;
        ws.connect(d);
        noise(ws, t, 0.75 + 0.2 * s, 'lowpass', 2800 * p, 70, 0.8, 0.9, 0.002);
        tone(ws, t, 0.55 + 0.15 * s, 'sine', 105 * p, 30, 0.9, 0.002);
        noise(d, t, 0.09, 'highpass', 1800, 4000, 0.6, 0.35, 0.001);
    },
    shatter(x, y, z, s = 1) {
        if (!ac || limit('shat', 50)) return;
        const d = out(x, y, z, 0.6, 0.5, 14);
        if (!d) return;
        const t = ac.currentTime;
        noise(d, t, 0.22, 'highpass', 2800, 6500, 0.9, 0.5 * s, 0.001);
        for (let i = 0; i < 5; i++) tone(d, t + Math.random() * 0.12, 0.16 + Math.random() * 0.2, 'sine', (1900 + Math.random() * 3600) / (0.7 + 0.3 * s), 1500, 0.1, 0.001);
    },
    shard(x, y, z) {
        if (!ac || limit('shard', 60)) return;
        const d = out(x, y, z, 0.5, 0.45, 16);
        if (!d) return;
        const t = ac.currentTime,
            p = rp(0.1);
        tone(d, t, 0.3, 'sine', 1750 * p, 2600 * p, 0.2);
        tone(d, t, 0.3, 'sine', 2630 * p, 3400 * p, 0.12);
        noise(d, t, 0.16, 'bandpass', 4200, 2000, 2.5, 0.25);
    },
    charge(x, y, z) {
        if (!ac || limit('chg', 120)) return;
        const d = out(x, y, z, 0.35, 0.4, 16);
        if (!d) return;
        tone(d, ac.currentTime, 0.6, 'triangle', 420, 1500, 0.2, 0.3);
    },
    chirp(x, y, z) {
        if (!ac || limit('chirp', 130)) return;
        const d = out(x, y, z, 0.35, 0.35, 10);
        if (!d) return;
        const t = ac.currentTime,
            p = rp(0.25);
        tone(d, t, 0.07, 'square', 1500 * p, 2300 * p, 0.1);
        tone(d, t + 0.08, 0.09, 'square', 2100 * p, 1200 * p, 0.1);
    },
    slam(x, y, z) {
        if (!ac) return;
        const d = out(x, y, z, 1.2, 0.7, 26);
        if (!d) return;
        const t = ac.currentTime;
        tone(d, t, 0.7, 'sine', 80, 24, 1, 0.002);
        noise(d, t, 0.5, 'lowpass', 900, 60, 0.8, 0.8, 0.002);
        noise(d, t, 0.3, 'highpass', 2500, 5000, 0.8, 0.25, 0.002);
    },
    roar(x, y, z) {
        if (!ac) return;
        const d = out(x, y, z, 1.0, 0.9, 60);
        if (!d) return;
        const t = ac.currentTime,
            f = ac.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 2.5;
        f.frequency.setValueAtTime(260, t);
        f.frequency.linearRampToValueAtTime(720, t + 0.7);
        f.frequency.linearRampToValueAtTime(180, t + 2.2);
        f.connect(d);
        for (const k of [1, 1.012, 1.5, 0.5]) tone(f, t, 2.3, 'sawtooth', 62 * k, 41 * k, 0.5, 0.25);
        noise(d, t, 2.2, 'lowpass', 500, 90, 1, 0.35, 0.3);
    },
    hurt() {
        if (!ac || limit('hurt', 120)) return;
        const d = out(null, 0, 0, 0.6, 0.1),
            t = ac.currentTime;
        tone(d, t, 0.18, 'sawtooth', 190, 70, 0.4, 0.002);
        noise(d, t, 0.12, 'lowpass', 900, 200, 1, 0.5, 0.002);
    },
    swap() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.45, 0.08),
            t = ac.currentTime;
        noise(d, t, 0.035, 'bandpass', 2600, 1800, 3, 0.6, 0.001);
        noise(d, t + 0.09, 0.05, 'bandpass', 1500, 900, 3, 0.7, 0.001);
        tone(d, t + 0.09, 0.07, 'triangle', 320, 140, 0.25, 0.001);
    },
    dry() {
        if (!ac || limit('dry', 160)) return;
        const d = out(null, 0, 0, 0.3, 0.05);
        noise(d, ac.currentTime, 0.04, 'bandpass', 900, 500, 4, 0.5, 0.001);
    },
    hit() {
        if (!ac || limit('hitm', 45)) return;
        const d = out(null, 0, 0, 0.22, 0);
        tone(d, ac.currentTime, 0.045, 'triangle', 1900, 1300, 0.5, 0.001);
    },
    kill() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.3, 0.1),
            t = ac.currentTime;
        tone(d, t, 0.07, 'triangle', 1250, 1250, 0.4, 0.001);
        tone(d, t + 0.06, 0.12, 'triangle', 1870, 1870, 0.4, 0.001);
    },
    step(v = 1) {
        if (!ac) return;
        const d = out(null, 0, 0, 0.16 * v, 0.1);
        noise(d, ac.currentTime, 0.11, 'bandpass', 700 * rp(0.25), 300, 0.9, 0.7, 0.008);
    },
    land() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.4, 0.15),
            t = ac.currentTime;
        noise(d, t, 0.2, 'lowpass', 800, 150, 0.8, 0.8, 0.004);
        tone(d, t, 0.14, 'sine', 95, 45, 0.5, 0.002);
    },
    pylon(x, y, z) {
        if (!ac) return;
        const d = out(x, y, z, 0.9, 0.9, 50);
        if (!d) return;
        const t = ac.currentTime;
        for (const [f, dl] of [[110, 0], [164.8, 0.12], [220, 0.24], [329.6, 0.36], [440, 0.5]]) {
            tone(d, t + dl, 2.6, 'sawtooth', f, f * 1.003, 0.13, 0.5);
            tone(d, t + dl, 2.6, 'sine', f * 2, f * 2, 0.1, 0.4);
        }
        noise(d, t, 1.8, 'bandpass', 300, 3200, 1.2, 0.3, 0.9);
    },
    ui() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.25, 0.1);
        tone(d, ac.currentTime, 0.08, 'sine', 660, 990, 0.4, 0.002);
    },
    win() {
        if (!ac) return;
        const d = out(null, 0, 0, 0.6, 0.8),
            t = ac.currentTime;
        [146.8, 220, 293.7, 370, 440, 587.3].forEach((f, i) => {
            tone(d, t + i * 0.16, 3.5, 'sawtooth', f, f, 0.1, 0.3);
            tone(d, t + i * 0.16, 3.5, 'sine', f * 2, f * 2, 0.08, 0.3);
        });
    },
};

// ---- adaptive bed: wind, fire crackle, pulse that tightens with combat intensity ----
let beat = 0,
    nextT = 0,
    wt = 0;
const SEQ = [0, 0, 3, 0, 0, 7, 0, 5, 0, 0, 3, 0, 10, 0, 7, 5];
export function audioTick(dt, fire, intensity, boss) {
    if (!ac) return;
    const t = ac.currentTime;
    AU.intensity += (intensity - AU.intensity) * Math.min(1, dt * 1.2);
    const I = AU.intensity;
    wt += dt;
    windG.gain.setTargetAtTime(0.035 + 0.03 * (0.5 + 0.5 * Math.sin(wt * 0.31) * Math.sin(wt * 0.13 + 1)), t, 0.4);
    windF.frequency.setTargetAtTime(260 + 160 * Math.sin(wt * 0.17), t, 0.5);
    fireG.gain.setTargetAtTime(Math.min(0.22, fire * 0.05) * (0.6 + 0.8 * Math.random()), t, 0.04);
    droneG.gain.setTargetAtTime(0.05 + 0.06 * I, t, 0.6);
    const step = (boss ? 0.2 : 0.25) * (1 - 0.1 * I);
    if (nextT < t) nextT = t + 0.05;
    while (nextT < t + 0.15) {
        if (I > 0.12) {
            const n = SEQ[beat % 16] + (boss && (beat >> 4) % 4 === 3 ? 1 : 0),
                f = 55 * Math.pow(2, n / 12);
            const fl = ac.createBiquadFilter();
            fl.type = 'lowpass';
            fl.Q.value = 5;
            fl.frequency.setValueAtTime(180 + 1500 * I * I, nextT);
            fl.frequency.exponentialRampToValueAtTime(110, nextT + step * 0.9);
            fl.connect(musG);
            tone(fl, nextT, step * 0.95, 'sawtooth', f, f, 0.2 * I, 0.004);
            if (beat % 4 === 0) tone(musG, nextT, 0.16, 'sine', 120, 38, 0.3 * I, 0.002);
            if (I > 0.45 && beat % 2 === 1) noise(musG, nextT, 0.04, 'highpass', 7000, 9000, 0.7, 0.07 * I, 0.001);
            if (I > 0.7 && beat % 8 === 4) noise(musG, nextT, 0.13, 'bandpass', 1900, 1200, 1.2, 0.16 * I, 0.001);
        }
        beat++;
        nextT += step;
    }
}
