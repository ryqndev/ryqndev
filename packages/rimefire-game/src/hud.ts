import { createHud, type HudCore } from '@ryqndev/kiln-core';
import { cam, project } from '@ryqndev/rimefire-renderer';

import type { Director } from './combat/types';
import { type Mode, S, type Stats } from './state';
import { type Pylon, W } from './world';

export type HudMode = Mode | 'unsupported';
/** Onboarding hints, by name. */
export type Hint = 'coat' | 'swap' | 'pylon';

export interface PylonMarker {
    lit: boolean;
    /** metres from the camera */
    dist: number;
    /** thaw progress, 0..20 */
    progress: number;
}

/**
 * Everything the HUD shows, on top of what every kiln HUD has (mode, banner, tip, frame rate).
 * The few things that change every frame (fades, world-anchored marker positions) live in
 * `hudSignals` instead.
 */
export interface HudState extends HudCore<HudMode, Stats, Hint> {
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
    pylons: PylonMarker[];
}

/** Floats per pylon in `hudSignals.markers`: x, y in normalised screen space, then 1 when in front of the camera. */
export const MARKER_STRIDE = 3;

const core = createHud<HudState, { resist: number; markers: Float32Array }>(
    {
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
    },
    {
        /** "no effect" notice opacity */
        resist: 0,
        markers: new Float32Array(3 * MARKER_STRIDE),
    },
    { banner: 3.4, toast: 1.6, kill: 0.42 }
);

export const hudStore = core.store;
/** Values that change every frame: the core hit marker and damage arc, plus this game's own. */
export const hudSignals = core.signals;
export const onHudFrame = core.onFrame;

let resT = 0;
const pj = { x: 0, y: 0, w: 0 };
const put = core.put;

const markerDistance = (q: Pylon) => Math.hypot(q.x - cam.x, q.z - cam.z) | 0;
const markerProgress = (q: Pylon) => Math.round((1 - Math.max(0, q.hp) / W.PYHP) * 20);

export const hud = {
    mode(mode: HudMode) {
        core.mode(mode, { ...S.stats });
    },
    hit: core.hit,
    resist() {
        resT = 1.1;
    },
    /** `a` is the world-space heading the damage came from */
    dmgDir: core.dmgDir,
    banner: core.banner,
    tip: core.tip,
    toast: core.toast,
    fps: core.fps,
    /** Runs once per frame: publishes changed values, advances timers, refreshes the per-frame signals. */
    update(dt: number, D: Director) {
        const p = S.pl;
        // dmgDir() is given the heading towards the attacker, so the arc is turned half way round
        const cur = core.begin(dt, p.yaw + Math.PI);
        resT = Math.max(0, resT - dt);
        hudSignals.resist = Math.min(1, resT * 3);

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

        core.commit(dt);
    },
};
