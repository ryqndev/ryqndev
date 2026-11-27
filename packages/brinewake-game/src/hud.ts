import { project } from '@ryqndev/brinewake-renderer';
import { createHud, type HudCore } from '@ryqndev/kiln-core';

import { reloadProgress } from './ships/battery';
import type { Sailor } from './ships/crew';
import { INFAMY, infamyOf, UPGRADES } from './ships/defs';
import { type Slot, SLOTS, STOCK } from './ships/fittings';
import { forts, loot, ships } from './ships/state';
import { TEAM } from './ships/types';
import { holdCap } from './shipyard';
import { type Mode, PL, S, type Stats } from './state';
import { W } from './world';

export type HudMode = Mode | 'unsupported';
/** Onboarding hints, by name. */
export type Hint = 'sail' | 'aim' | 'plunder' | 'bank' | 'dock' | 'full';

/** Steps a broadside's reload gauge is published in. */
export const RELOAD_STEPS = 12;

/**
 * Everything the HUD shows, on top of what every kiln HUD has (mode, banner, tip, frame rate).
 * The few things that change every frame (world-anchored markers, the chart) live in `hudSignals`
 * instead.
 */
export interface HudState extends HudCore<HudMode, Stats, Hint> {
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
    /** the player's build and what they own: see Progress */
    cls: number;
    hulls: boolean[];
    levels: number[];
    fit: Record<Slot, string>;
    owned: string[];
    crew: Sailor[];
    tavern: Sailor[];
    escorts: number;
    won: boolean;
    /** in the drydock: the shipyard on its own, on a career that is not kept */
    drydock: boolean;
}

/** Floats per marker in `hudSignals.targets` (a ship, or a fort): x, y in normalised screen space, hull 0..1, team, crew 0..1. */
export const TARGET_STRIDE = 5;
export const MAX_TARGETS = 8;
/** Floats per chart blip in `hudSignals.blips`: world x, world z, kind (see BLIP). */
export const BLIP_STRIDE = 3;
export const MAX_BLIPS = 64;
export const BLIP = { NAVY: 0, TRADE: 1, FRIEND: 2, LOOT: 3, FLAGSHIP: 4, FORT: 5 } as const;

const core = createHud<HudState, { targets: Float32Array; targetCount: number; blips: Float32Array; blipCount: number; self: Float32Array; home: Float32Array }>(
    {
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
        hulls: [true, false, false],
        levels: UPGRADES.map(() => 0),
        fit: { ...STOCK },
        owned: [],
        crew: [],
        tavern: [],
        escorts: 0,
        won: false,
        drydock: false,
        banner: { title: '', sub: '' },
        bannerOn: false,
        tip: { kind: 'sail', text: '' },
        tipOn: false,
        fps: '',
    },
    {
        /** ships worth a health bar, nearest first come first served */
        targets: new Float32Array(MAX_TARGETS * TARGET_STRIDE),
        targetCount: 0,
        blips: new Float32Array(MAX_BLIPS * BLIP_STRIDE),
        blipCount: 0,
        /** the player's ship on the chart: world x, world z, heading */
        self: new Float32Array(3),
        /** the home port's waypoint: x, y in normalised screen space, 1 when in front of the camera, metres away */
        home: new Float32Array(4),
    },
    { banner: 4, toast: 2.2, kill: 0.5 }
);

export const hudStore = core.store;
/** Values that change every frame: the core hit marker and damage arc, plus this game's own. */
export const hudSignals = core.signals;
export const onHudFrame = core.onFrame;

// true while a published list of sailors still says what the game's own does
const sameSailors = (a: Sailor[], b: Sailor[]) => a.length === b.length && a.every((s, i) => s.id === b[i].id && s.post === b[i].post && s.name === b[i].name && s.cost === b[i].cost);
// React is handed copies: the game goes on changing its own
const copies = (list: Sailor[]) => list.map((s) => ({ ...s }));

const pj = { x: 0, y: 0, w: 0 };
/** How far off a ship still gets a health bar, metres. */
const TARGET_RANGE = 420;
const put = core.put;

export const hud = {
    mode(mode: HudMode) {
        core.mode(mode, { ...S.prog.stats });
    },
    hit: core.hit,
    /** `a` is the world-space heading the shot was travelling */
    dmgDir: core.dmgDir,
    banner: core.banner,
    tip: core.tip,
    toast: core.toast,
    fps: core.fps,
    /** Runs once per frame: publishes changed values, advances timers, refreshes the per-frame signals. */
    update(dt: number) {
        const p = PL.ship,
            prog = S.prog;
        const cur = core.begin(dt, PL.camYaw);

        put('hp', Math.max(0, Math.ceil(p.hp)));
        put('maxHp', Math.round(p.max));
        put('hold', Math.round(S.hold));
        put('cap', holdCap());
        put('gold', prog.gold);
        put('sail', p.sail);
        put('port', Math.round(reloadProgress(p, 0) * RELOAD_STEPS));
        put('starboard', Math.round(reloadProgress(p, 1) * RELOAD_STEPS));
        put('side', PL.side);
        const level = infamyOf(prog.renown);
        put('infamy', level);
        put('wanted', level >= INFAMY.length - 1 ? 10 : Math.floor(((prog.renown - INFAMY[level]) / (INFAMY[level + 1] - INFAMY[level])) * 10));
        put('cls', prog.cls);
        put('escorts', prog.escorts);
        put('won', prog.won);
        put('drydock', S.drydock);
        if (prog.levels.some((l, i) => l !== cur.levels[i])) put('levels', [...prog.levels]);
        if (prog.hulls.some((o, i) => o !== cur.hulls[i])) put('hulls', [...prog.hulls]);
        if (SLOTS.some((slot) => prog.fit[slot] !== cur.fit[slot])) put('fit', { ...prog.fit });
        if (prog.owned.length !== cur.owned.length || prog.owned.some((id, i) => id !== cur.owned[i])) put('owned', [...prog.owned]);
        if (!sameSailors(prog.crew, cur.crew)) put('crew', copies(prog.crew));
        if (!sameSailors(prog.tavern, cur.tavern)) put('tavern', copies(prog.tavern));

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
            targets[t + 4] = s.crew;
        }
        // the king's forts: always on the chart while they stand, and a bar over one near enough to shell
        for (const f of forts) {
            if (f.down > 0 || nb >= MAX_BLIPS) continue;
            const o = nb++ * BLIP_STRIDE;
            blips[o] = f.x;
            blips[o + 1] = f.z;
            blips[o + 2] = BLIP.FORT;
            if (nt >= MAX_TARGETS || (f.x - p.x) ** 2 + (f.z - p.z) ** 2 > TARGET_RANGE * TARGET_RANGE) continue;
            if (!project(f.x, f.top + 12, f.z, pj) || pj.x < 0 || pj.x > 1 || pj.y < 0 || pj.y > 1) continue;
            const t = nt++ * TARGET_STRIDE;
            targets[t] = pj.x;
            targets[t + 1] = pj.y;
            targets[t + 2] = f.hp / f.max;
            targets[t + 3] = TEAM.NAVY;
            targets[t + 4] = 1;
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

        core.commit(dt);
    },
};
