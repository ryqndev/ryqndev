import { cam, project } from '@ryqndev/rimefire-renderer';
import { createStore } from 'zustand/vanilla';

import type { Director } from './combat/types';
import { type Mode, S, type Stats } from './state';
import { type Pylon, W } from './world';

export type HudMode = Mode | 'unsupported';
export type TipKind = 'coat' | 'swap' | 'pylon' | 'toast';

export interface PylonMarker {
    lit: boolean;
    /** metres from the camera */
    dist: number;
    /** thaw progress, 0..20 */
    progress: number;
}

/**
 * Everything the HUD shows. The simulation writes a value only when it actually changes, so React
 * re-renders on changes rather than every frame. The few things that do change every frame
 * (fades, world-anchored marker positions) live in `hudSignals` instead.
 */
export interface HudState {
    mode: HudMode;
    stats: Stats;
    weapon: number;
    /** gel tank, 0..100 */
    gel: number;
    dry: boolean;
    /** striker cooldown, 0..20 */
    heat: number;
    hp: number;
    lit: number;
    /** index into the objective text list */
    objective: number;
    bossOn: boolean;
    /** 0..200 */
    bossHp: number;
    bossArmored: boolean;
    nodes: boolean[];
    chain: number;
    chainOn: boolean;
    banner: { title: string; sub: string };
    bannerOn: boolean;
    tip: { kind: TipKind; text: string };
    tipOn: boolean;
    fps: string;
    pylons: PylonMarker[];
}

export const hudStore = createStore<HudState>(() => ({
    mode: 'title',
    stats: { det: 0, best: 0, kills: 0, time: 0 },
    weapon: 0,
    gel: 100,
    dry: false,
    heat: 0,
    hp: 100,
    lit: 0,
    objective: 0,
    bossOn: false,
    bossHp: 200,
    bossArmored: true,
    nodes: [true, true, true, true],
    chain: 0,
    chainOn: false,
    banner: { title: '', sub: '' },
    bannerOn: false,
    tip: { kind: 'coat', text: '' },
    tipOn: false,
    fps: '',
    pylons: [],
}));

/** Floats per pylon in `hudSignals.markers`: x, y in normalised screen space, then 1 when in front of the camera. */
export const MARKER_STRIDE = 3;

/**
 * Values that change every frame. They deliberately bypass React: HUD components read them in a
 * frame callback (see onHudFrame) and write straight to the DOM.
 */
export const hudSignals = {
    /** hit-marker opacity and whether the last hit was a kill */
    hit: 0,
    hitKill: false,
    /** "no effect" notice opacity */
    resist: 0,
    /** damage-direction arc: opacity and rotation in degrees */
    dmg: 0,
    dmgRot: 0,
    markers: new Float32Array(3 * MARKER_STRIDE),
};

type FrameListener = (dt: number) => void;
const frameListeners: FrameListener[] = [];
/** Subscribes to the game's frame tick, after the simulation and HUD state have updated. */
export function onHudFrame(fn: FrameListener): () => void {
    frameListeners.push(fn);
    return () => {
        const i = frameListeners.indexOf(fn);
        if (i >= 0) frameListeners.splice(i, 1);
    };
}

let banT = 0,
    tipT = 0,
    hmT = 0,
    resT = 0,
    ddT = 0,
    ddA = 0;
const pj = { x: 0, y: 0, w: 0 };

const markerDistance = (q: Pylon) => Math.hypot(q.x - cam.x, q.z - cam.z) | 0;
const markerProgress = (q: Pylon) => Math.round((1 - Math.max(0, q.hp) / W.PYHP) * 20);

// collects this frame's changes so the store is written at most once per frame
let cur: HudState = hudStore.getState();
let next: Partial<HudState> | null = null;
function put<K extends keyof HudState>(k: K, v: HudState[K]) {
    if (cur[k] !== v) (next ??= {})[k] = v;
}

export const hud = {
    mode(mode: HudMode) {
        hudStore.setState({ mode, stats: { ...S.stats } });
    },
    hit(kill: boolean) {
        hmT = kill ? 0.42 : 0.2;
        hudSignals.hitKill = kill;
    },
    resist() {
        resT = 1.1;
    },
    /** `a` is the world-space heading the damage came from */
    dmgDir(a: number) {
        ddT = 1;
        ddA = a;
    },
    banner(title: string, sub = '') {
        hudStore.setState({ banner: { title, sub }, bannerOn: true });
        banT = 3.4;
    },
    tip(kind: TipKind, dur = 5, text = '') {
        const s = hudStore.getState();
        if (!s.tipOn || s.tip.kind !== kind || s.tip.text !== text) hudStore.setState({ tip: { kind, text }, tipOn: true });
        tipT = dur;
    },
    toast(text: string) {
        hud.tip('toast', 1.6, text);
    },
    fps(text: string) {
        if (hudStore.getState().fps !== text) hudStore.setState({ fps: text });
    },
    /** Runs once per frame: publishes changed values, advances timers, refreshes the per-frame signals. */
    update(dt: number, D: Director) {
        const p = S.pl;
        cur = hudStore.getState();
        if (banT > 0 && (banT -= dt) <= 0) put('bannerOn', false);
        if (tipT > 0 && (tipT -= dt) <= 0) put('tipOn', false);
        hmT = Math.max(0, hmT - dt);
        resT = Math.max(0, resT - dt);
        ddT = Math.max(0, ddT - dt * 1.3);
        hudSignals.hit = Math.min(1, hmT * 6);
        hudSignals.resist = Math.min(1, resT * 3);
        hudSignals.dmg = ddT;
        if (ddT > 0) hudSignals.dmgRot = (-(ddA - p.yaw) * 180) / Math.PI + 180;

        put('weapon', p.weapon);
        put('gel', Math.round(p.gel));
        put('dry', p.dry);
        put('heat', Math.round(Math.max(0, 1 - p.cool * 3.6) * 20));
        put('hp', Math.ceil(p.hp));
        put('lit', D.lit);
        put('objective', D.boss ? (D.won ? 3 : 2) : D.lit === 3 ? 1 : 0);
        const b = D.boss;
        put('bossOn', !!b && !D.won);
        if (b) {
            put('bossHp', Math.round((Math.max(0, b.hp) / b.max) * 200));
            put('bossArmored', !(b.stun > 0));
            for (let i = 0; i < b.nodes.length; i++) {
                if (b.nodes[i].hp > 0 !== cur.nodes[i]) {
                    put('nodes', b.nodes.map((n) => n.hp > 0));
                    break;
                }
            }
        }
        if (S.chain >= 3) put('chain', S.chain);
        put('chainOn', S.chain >= 3);

        // pylon waypoints: screen position every frame, distance and progress only when they change
        const pylons = W.pylons,
            markers = hudSignals.markers;
        let stale = cur.pylons.length !== pylons.length;
        for (let i = 0; i < pylons.length; i++) {
            const q = pylons[i],
                shown = cur.pylons[i];
            if (!shown || shown.lit !== q.lit || shown.dist !== markerDistance(q) || shown.progress !== markerProgress(q)) stale = true;
            if (q.lit) continue;
            const o = i * MARKER_STRIDE,
                visible = project(q.x, q.y + 9.3, q.z, pj);
            markers[o] = pj.x;
            markers[o + 1] = pj.y;
            markers[o + 2] = visible ? 1 : 0;
        }
        if (stale) put('pylons', pylons.map((q) => ({ lit: q.lit, dist: markerDistance(q), progress: markerProgress(q) })));

        if (next) {
            hudStore.setState(next);
            next = null;
        }
        for (let i = 0; i < frameListeners.length; i++) frameListeners[i](dt);
    },
};
