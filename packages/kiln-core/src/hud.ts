import { createStore, type StoreApi } from 'zustand/vanilla';

/**
 * The part of the HUD state every game has; a game's own state extends it. The simulation writes a
 * value only when it actually changes, so React re-renders on changes rather than every frame. The
 * few things that do change every frame live in the signals instead.
 */
export interface HudCore<Mode extends string = string, Stats = unknown, Hint extends string = string> {
    mode: Mode;
    /** the run's tallies as of the last mode change, for the end-of-run screens */
    stats: Stats;
    banner: { title: string; sub: string };
    bannerOn: boolean;
    /** an onboarding hint by name, or free text when the kind is 'toast' */
    tip: { kind: Hint | 'toast'; text: string };
    tipOn: boolean;
    /** frame-rate readout; empty when hidden */
    fps: string;
}

/**
 * Values that change every frame. They deliberately bypass React: HUD components read them in a
 * frame callback (see Hud.onFrame) and write straight to the DOM.
 */
export interface HudSignals {
    /** hit-marker opacity and whether the last hit was a kill */
    hit: number;
    hitKill: boolean;
    /** damage-direction arc: opacity and rotation in degrees */
    dmg: number;
    dmgRot: number;
}

export interface HudTimings {
    /** seconds a banner stays up */
    banner: number;
    /** seconds a toast stays up */
    toast: number;
    /** seconds the hit marker lingers after a kill (an ordinary hit gets 0.2) */
    kill: number;
}

export type FrameListener = (dt: number) => void;

export interface Hud<S extends HudCore, X extends object = object> {
    store: StoreApi<S>;
    signals: HudSignals & X;
    /** Subscribes to the game's frame tick, after the simulation and HUD state have updated. */
    onFrame(fn: FrameListener): () => void;
    mode(mode: S['mode'], stats: S['stats']): void;
    hit(kill: boolean): void;
    /** `a` is the world-space heading of the damage; begin() turns it against the view heading it is given */
    dmgDir(a: number): void;
    banner(title: string, sub?: string): void;
    tip(kind: S['tip']['kind'], dur?: number, text?: string): void;
    toast(text: string): void;
    fps(text: string): void;
    /**
     * Starts a frame's HUD update: advances the timers and refreshes the core signals. Returns the
     * state as currently shown, to compare against.
     */
    begin(dt: number, viewYaw: number): S;
    /** Queues a value for this frame's store write. Does nothing when the value is already shown. */
    put<K extends keyof S>(key: K, value: S[K]): void;
    /** Ends a frame's HUD update: writes everything queued in one go, then runs the frame listeners. */
    commit(dt: number): void;
}

/**
 * Builds a game's HUD: a store for what React renders, signals for what changes every frame, and
 * the banner / tip / hit-marker plumbing that drives both. `signals` adds the game's own per-frame
 * values to the core ones.
 */
export function createHud<S extends HudCore, X extends object = object>(initial: S, signals: X, timings: HudTimings): Hud<S, X> {
    const store = createStore<S>(() => initial);
    // the core fields, addressed without the game's own type in the way
    const core = store as unknown as StoreApi<HudCore>;
    const sig: HudSignals & X = Object.assign({ hit: 0, hitKill: false, dmg: 0, dmgRot: 0 }, signals);
    const listeners: FrameListener[] = [];

    let banT = 0,
        tipT = 0,
        hitT = 0,
        dmgT = 0,
        dmgA = 0;
    // collects this frame's changes so the store is written at most once per frame
    let cur = store.getState();
    let next: Partial<S> | null = null;
    const put = <K extends keyof S>(key: K, value: S[K]) => {
        if (cur[key] === value) return;
        next ??= {};
        next[key] = value;
    };

    const hud: Hud<S, X> = {
        store,
        signals: sig,
        onFrame(fn) {
            listeners.push(fn);
            return () => {
                const i = listeners.indexOf(fn);
                if (i >= 0) listeners.splice(i, 1);
            };
        },
        mode(mode, stats) {
            core.setState({ mode, stats });
        },
        hit(kill) {
            hitT = kill ? timings.kill : 0.2;
            sig.hitKill = kill;
        },
        dmgDir(a) {
            dmgT = 1;
            dmgA = a;
        },
        banner(title, sub = '') {
            core.setState({ banner: { title, sub }, bannerOn: true });
            banT = timings.banner;
        },
        tip(kind, dur = 5, text = '') {
            const s = core.getState();
            if (!s.tipOn || s.tip.kind !== kind || s.tip.text !== text) core.setState({ tip: { kind, text }, tipOn: true });
            tipT = dur;
        },
        toast(text) {
            hud.tip('toast', timings.toast, text);
        },
        fps(text) {
            if (core.getState().fps !== text) core.setState({ fps: text });
        },
        begin(dt, viewYaw) {
            cur = store.getState();
            if (banT > 0 && (banT -= dt) <= 0) put('bannerOn', false as S['bannerOn']);
            if (tipT > 0 && (tipT -= dt) <= 0) put('tipOn', false as S['tipOn']);
            hitT = Math.max(0, hitT - dt);
            dmgT = Math.max(0, dmgT - dt * 1.3);
            sig.hit = Math.min(1, hitT * 6);
            sig.dmg = dmgT;
            if (dmgT > 0) sig.dmgRot = (-(dmgA - viewYaw) * 180) / Math.PI;
            return cur;
        },
        put,
        commit(dt) {
            if (next) {
                store.setState(next);
                next = null;
            }
            for (let i = 0; i < listeners.length; i++) listeners[i](dt);
        },
    };
    return hud;
}
