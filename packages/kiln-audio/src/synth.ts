// A small WebAudio synth: a game builds everything it plays out of filtered noise and oscillators
// at runtime. No samples. One synth runs per page.
import { clamp } from '@ryqndev/kiln-math';

export interface SynthOptions {
    /** release of the master compressor, seconds */
    release: number;
    /** the shared reverb: the room every sound is sent to in some measure */
    reverb: {
        /** length of the tail, seconds */
        seconds: number;
        /** how fast the tail dies away; higher is drier */
        decay: number;
        /** samples the tail takes to fade in */
        fadeIn: number;
        /** level the reverb returns at */
        level: number;
    };
    /** how much of the music bus is sent to the reverb */
    musicWet: number;
    /** metres at which a positioned sound has fallen to half its gain, unless out() is told otherwise */
    range: number;
    /** sounds nearer than this are left unpanned, metres */
    panFrom: number;
}

/** The audio context, once startAudio() has run. Sound effects check it before doing anything. */
export let ac: AudioContext | null = null;
// non-null alias for the helpers that only ever run after startAudio()
let ctx!: AudioContext;
let master!: GainNode, rev!: ConvolverNode, nbuf!: AudioBuffer;
/** The music bus. Connect a voice to it to have it mixed in and sent to the reverb. */
export let music!: GainNode;
let range = 9,
    panFrom = 0.5;
const L = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
const last: Record<string, number> = {};
/** Master volume, the smoothed intensity an adaptive score follows, and whether the synth is running. */
export const AU = { vol: 0.8, intensity: 0, ready: false };

/**
 * Starts the synth, or resumes it when it is already running. Browsers only allow this from a
 * user gesture. `build` runs once, when the graph has just been made: the place for a game to
 * start its own beds and drones (see bed()), connecting anything else to `master`.
 */
export function startAudio(options: SynthOptions, build: (ctx: AudioContext, master: GainNode) => void) {
    if (ac) {
        ac.resume();
        return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ac = ctx = new AC();
    range = options.range;
    panFrom = options.panFrom;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = options.release;
    master = ctx.createGain();
    master.gain.value = AU.vol;
    master.connect(comp);
    comp.connect(ctx.destination);
    // reverb: decaying noise for an impulse response
    const { seconds, decay, fadeIn, level } = options.reverb;
    const sr = ctx.sampleRate,
        len = (sr * seconds) | 0,
        ir = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < fadeIn ? i / fadeIn : 1);
    }
    rev = ctx.createConvolver();
    rev.buffer = ir;
    const rg = ctx.createGain();
    rg.gain.value = level;
    rev.connect(rg);
    rg.connect(master);
    // two seconds of white noise: the raw material of every noise() and bed()
    nbuf = ctx.createBuffer(1, sr * 2, sr);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    music = ctx.createGain();
    music.gain.value = 0.5;
    music.connect(master);
    const mw = ctx.createGain();
    mw.gain.value = options.musicWet;
    music.connect(mw);
    mw.connect(rev);
    build(ctx, master);
    AU.ready = true;
}

/**
 * A looping bed of filtered noise (wind, surf, fire), playing from now on. Returns its gain and
 * filter, for the game to ride every frame.
 */
export function bed(type: BiquadFilterType, frequency: number, q: number, gain: number): [GainNode, BiquadFilterNode] {
    const s = ctx.createBufferSource();
    s.buffer = nbuf;
    s.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = frequency;
    fl.Q.value = q;
    const gn = ctx.createGain();
    gn.gain.value = gain;
    s.connect(fl);
    fl.connect(gn);
    gn.connect(master);
    // each bed starts somewhere else in the noise, so no two of them sound alike
    s.start(0, Math.random());
    return [gn, fl];
}

/** Where sounds are heard from: a position and the listener's right-hand direction. */
export function setListener(x: number, y: number, z: number, rx: number, rz: number) {
    L.x = x;
    L.y = y;
    L.z = z;
    L.rx = rx;
    L.rz = rz;
}
/** Metres from the listener to a point, for sounds that change character with distance and not just level. */
export const distanceTo = (x: number, y: number, z: number) => Math.hypot(x - L.x, y - L.y, z - L.z);
export function setVolume(v: number) {
    AU.vol = v;
    if (master) master.gain.value = v;
}
export function suspendAudio(s: boolean) {
    if (!ac) return;
    if (s) ac.suspend();
    else ac.resume();
}

/** Rate limiter, so a burst of identical events does not stack into one loud click. True when `key` fired less than `ms` ago. */
export function limit(key: string, ms: number) {
    const n = performance.now();
    if (n - (last[key] || 0) < ms) return true;
    last[key] = n;
    return false;
}

/**
 * Output chain for one sound: positioned when x is given, otherwise centred. `wet` is how much of
 * it goes to the reverb, `range` the distance at which it has fallen to half gain. Returns the node
 * to play into, or null when the sound would be inaudible from where the listener is.
 */
export function out(x: null, y: number, z: number, gain: number, wet?: number, range?: number): GainNode;
export function out(x: number, y: number, z: number, gain: number, wet?: number, range?: number): GainNode | null;
export function out(x: number | null, y: number, z: number, gain: number, wet = 0.3, reach = range): GainNode | null {
    let pan = 0,
        g = gain;
    if (x !== null) {
        const dx = x - L.x,
            dy = y - L.y,
            dz = z - L.z,
            d = Math.hypot(dx, dy, dz);
        g = gain / (1 + (d / reach) * (d / reach));
        if (g < 0.004) return null;
        pan = d > panFrom ? clamp(((dx * L.rx + dz * L.rz) / d) * 0.85, -1, 1) : 0;
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

/** A burst of filtered noise into `dst`: the filter sweeps from f0 to f1 while the gain decays from g0. */
export function noise(dst: AudioNode, t0: number, dur: number, type: BiquadFilterType, f0: number, f1: number, q: number, g0: number, att = 0.003) {
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

/** A pitched note into `dst`: the oscillator glides from f0 to f1 while the gain decays from g0. */
export function tone(dst: AudioNode, t0: number, dur: number, type: OscillatorType, f0: number, f1: number, g0: number, att = 0.003) {
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

// soft clipping: tanh, hard enough that a full-scale input comes out nearly square
const DRIVE = new Float32Array(1025).map((_, i) => Math.tanh((i / 512 - 1) * 3));
/**
 * An overdrive stage into `dst`, coming out at `level`. Play a loud voice into it and it tears and
 * flattens: the way an explosion overloads the air, and it gives low sounds harmonics that small
 * speakers can still carry. Signals above full scale are clipped flat.
 */
export function drive(dst: AudioNode, level = 1): WaveShaperNode {
    const s = ctx.createWaveShaper(),
        g = ctx.createGain();
    s.curve = DRIVE;
    g.gain.value = level;
    s.connect(g);
    g.connect(dst);
    return s;
}

/** A random factor around 1, for detuning repeats of the same sound so they do not sound stamped out. */
export const rp = (a = 0.08) => 1 + (Math.random() * 2 - 1) * a;
