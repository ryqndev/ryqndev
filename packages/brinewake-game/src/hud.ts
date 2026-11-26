import { project } from '@ryqndev/brinewake-renderer';
import { createStore } from 'zustand/vanilla';

import { INFAMY, infamyOf } from './ships/defs';
import { loot, ships } from './ships/state';
import { TEAM } from './ships/types';
import { holdCap } from './shipyard';
import { type Mode, PL, S, type Stats } from './state';
import { W } from './world';

export type HudMode = Mode | 'unsupported';
export type TipKind = 'sail' | 'aim' | 'plunder' | 'bank' | 'dock' | 'full' | 'toast';

/** Steps a broadside's reload gauge is published in. */
export const RELOAD_STEPS = 12;

/**
 * Everything the HUD shows. The simulation writes a value only when it actually changes, so React
 * re-renders on changes rather than every frame. The few things that do change every frame
 * (fades, world-anchored markers, the chart) live in `hudSignals` instead.
 */
export interface HudState {
    mode: HudMode;
    stats: Stats;
    hp: number;
    maxHp: number;
    /** plunder aboard, the most the hold takes, and gold banked at port */
    hold: number;
    cap: number;
    gold: number;
    /** canvas ordered, 0..3 */
    sail: number;
    /** reload of each battery, 0..RELOAD_STEPS (full = ready) */
    port: number;
    starboard: number;
    /** the battery being laid: 0 port, 1 starboard, -1 when neither bears */
    side: number;
    infamy: number;
    /** progress toward the next level of infamy, 0..10 */
    wanted: number;
    cls: number;
    levels: number[];
    escorts: number;
    won: boolean;
    banner: { title: string; sub: string };
    bannerOn: boolean;
    tip: { kind: TipKind; text: string };
    tipOn: boolean;
    fps: string;
}

export const hudStore = createStore<HudState>(() => ({
    mode: 'title',
    stats: { sunk: 0, plunder: 0, time: 0 },
    hp: 100,
    maxHp: 100,
    hold: 0,
    cap: 300,
    gold: 0,
    sail: 0,
    port: RELOAD_STEPS,
    starboard: RELOAD_STEPS,
    side: -1,
    infamy: 0,
    wanted: 0,
    cls: 0,
    levels: [0, 0, 0, 0, 0, 0],
    escorts: 0,
    won: false,
    banner: { title: '', sub: '' },
    bannerOn: false,
    tip: { kind: 'sail', text: '' },
    tipOn: false,
    fps: '',
}));

/** Floats per ship marker in `hudSignals.targets`: x, y in normalised screen space, hull 0..1, team. */
export const TARGET_STRIDE = 4;
export const MAX_TARGETS = 8;
/** Floats per chart blip in `hudSignals.blips`: world x, world z, kind (see BLIP). */
export const BLIP_STRIDE = 3;
export const MAX_BLIPS = 64;
export const BLIP = { NAVY: 0, TRADE: 1, FRIEND: 2, LOOT: 3, FLAGSHIP: 4 } as const;

/**
 * Values that change every frame. They deliberately bypass React: HUD components read them in a
 * frame callback (see onHudFrame) and write straight to the DOM or a canvas.
 */
export const hudSignals = {
    /** hit-marker opacity and whether the last hit sank its target */
    hit: 0,
    hitKill: false,
    /** damage-direction arc: opacity and rotation in degrees */
    dmg: 0,
    dmgRot: 0,
    /** ships worth a health bar, nearest first come first served */
    targets: new Float32Array(MAX_TARGETS * TARGET_STRIDE),
    targetCount: 0,
    blips: new Float32Array(MAX_BLIPS * BLIP_STRIDE),
    blipCount: 0,
    /** the player's ship on the chart: world x, world z, heading */
    self: new Float32Array(3),
    /** the home port's waypoint: x, y in normalised screen space, 1 when in front of the camera, metres away */
    home: new Float32Array(4),
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
    ddT = 0,
    ddA = 0;
const pj = { x: 0, y: 0, w: 0 };
/** How far off a ship still gets a health bar, metres. */
const TARGET_RANGE = 420;

// collects this frame's changes so the store is written at most once per frame
let cur: HudState = hudStore.getState();
let next: Partial<HudState> | null = null;
function put<K extends keyof HudState>(k: K, v: HudState[K]) {
    if (cur[k] !== v) (next ??= {})[k] = v;
}

export const hud = {
    mode(mode: HudMode) {
        hudStore.setState({ mode, stats: { ...S.prog.stats } });
    },
    hit(kill: boolean) {
        hmT = kill ? 0.5 : 0.2;
        hudSignals.hitKill = kill;
    },
    /** `a` is the world-space heading the damage came from */
    dmgDir(a: number) {
        ddT = 1;
        ddA = a;
    },
    banner(title: string, sub = '') {
        hudStore.setState({ banner: { title, sub }, bannerOn: true });
        banT = 4;
    },
    tip(kind: TipKind, dur = 5, text = '') {
        const s = hudStore.getState();
        if (!s.tipOn || s.tip.kind !== kind || s.tip.text !== text) hudStore.setState({ tip: { kind, text }, tipOn: true });
        tipT = dur;
    },
    toast(text: string) {
        hud.tip('toast', 2.2, text);
    },
    fps(text: string) {
        if (hudStore.getState().fps !== text) hudStore.setState({ fps: text });
    },
    /** Runs once per frame: publishes changed values, advances timers, refreshes the per-frame signals. */
    update(dt: number) {
        const p = PL.ship,
            prog = S.prog;
        cur = hudStore.getState();
        if (banT > 0 && (banT -= dt) <= 0) put('bannerOn', false);
        if (tipT > 0 && (tipT -= dt) <= 0) put('tipOn', false);
        hmT = Math.max(0, hmT - dt);
        ddT = Math.max(0, ddT - dt * 1.3);
        hudSignals.hit = Math.min(1, hmT * 6);
        hudSignals.dmg = ddT;
        if (ddT > 0) hudSignals.dmgRot = (-(ddA - PL.camYaw) * 180) / Math.PI;

        put('hp', Math.max(0, Math.ceil(p.hp)));
        put('maxHp', Math.round(p.max));
        put('hold', Math.round(S.hold));
        put('cap', holdCap());
        put('gold', prog.gold);
        put('sail', p.sail);
        put('port', Math.round((1 - p.rl[0] / p.reload) * RELOAD_STEPS));
        put('starboard', Math.round((1 - p.rl[1] / p.reload) * RELOAD_STEPS));
        put('side', PL.side);
        const level = infamyOf(prog.renown);
        put('infamy', level);
        put('wanted', level >= INFAMY.length - 1 ? 10 : Math.floor(((prog.renown - INFAMY[level]) / (INFAMY[level + 1] - INFAMY[level])) * 10));
        put('cls', prog.cls);
        put('escorts', prog.escorts);
        put('won', prog.won);
        if (prog.levels.some((l, i) => l !== cur.levels[i])) put('levels', [...prog.levels]);

        // the chart, and health bars over the ships near enough to matter
        const sig = hudSignals,
            blips = sig.blips,
            targets = sig.targets;
        let nb = 0,
            nt = 0;
        for (let i = 0; i < ships.length && nb < MAX_BLIPS; i++) {
            const s = ships[i];
            if (s === p || s.dead) continue;
            const o = nb++ * BLIP_STRIDE;
            blips[o] = s.x;
            blips[o + 1] = s.z;
            blips[o + 2] = s.team === TEAM.PIRATE ? BLIP.FRIEND : s.role === 'flagship' ? BLIP.FLAGSHIP : s.team === TEAM.NAVY ? BLIP.NAVY : BLIP.TRADE;
            if (s.team === TEAM.PIRATE || nt >= MAX_TARGETS || (s.x - p.x) ** 2 + (s.z - p.z) ** 2 > TARGET_RANGE * TARGET_RANGE) continue;
            if (!project(s.x, s.y + (s.hull.flag[1] + 3) * s.scale, s.z, pj) || pj.x < 0 || pj.x > 1 || pj.y < 0 || pj.y > 1) continue;
            const t = nt++ * TARGET_STRIDE;
            targets[t] = pj.x;
            targets[t + 1] = pj.y;
            targets[t + 2] = s.hp / s.max;
            targets[t + 3] = s.team;
        }
        for (let i = 0; i < loot.length && nb < MAX_BLIPS; i++) {
            const o = nb++ * BLIP_STRIDE;
            blips[o] = loot[i].x;
            blips[o + 1] = loot[i].z;
            blips[o + 2] = BLIP.LOOT;
        }
        sig.blipCount = nb;
        sig.targetCount = nt;
        sig.self[0] = p.x;
        sig.self[1] = p.z;
        sig.self[2] = p.yaw;
        const front = project(W.port.x, 14, W.port.z, pj);
        sig.home[0] = pj.x;
        sig.home[1] = pj.y;
        sig.home[2] = front ? 1 : 0;
        sig.home[3] = Math.hypot(W.port.x - p.x, W.port.z - p.z);

        if (next) {
            hudStore.setState(next);
            next = null;
        }
        for (let i = 0; i < frameListeners.length; i++) frameListeners[i](dt);
    },
};
