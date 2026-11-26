import { clamp } from '@ryqndev/rimefire-math';

import { MAX_ESCORTS, MAX_LEVEL, UPGRADES } from './ships/defs';
import { newProgress, type Progress, S } from './state';

const KEY = 'brinewake:save:1';
const count = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.floor(v), 0, max) : 0);

/** Reads the saved game, falling back to a fresh one if there is none or it does not parse. */
export function loadProgress(): Progress {
    const fresh = newProgress();
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return fresh;
        const p = JSON.parse(raw) as Partial<Progress>;
        return {
            gold: count(p.gold, 1e9),
            cls: count(p.cls, 2),
            levels: UPGRADES.map((_, i) => count(p.levels?.[i], MAX_LEVEL)),
            escorts: count(p.escorts, MAX_ESCORTS),
            renown: count(p.renown, 1e6),
            won: p.won === true,
            stats: { sunk: count(p.stats?.sunk, 1e9), plunder: count(p.stats?.plunder, 1e9), time: count(p.stats?.time, 1e9) },
        };
    } catch {
        return fresh;
    }
}

/** Writes the game to local storage. Storage can be unavailable (private windows); the game then simply does not persist. */
export function saveProgress() {
    try {
        localStorage.setItem(KEY, JSON.stringify(S.prog));
    } catch {
        /* nothing to do: play on without a save */
    }
}

export function clearProgress() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* nothing saved to remove */
    }
}
