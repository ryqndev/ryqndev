import { clamp } from '@ryqndev/kiln-math';

import { NET } from './net/role';
import { aboard, isStation, MAX_SKILL, type Sailor, type Skill, SKILLS, type Station, TAVERN_SIZE, tavernful } from './ships/crew';
import { CLASSES, infamyOf, MAX_ESCORTS, maxLevel, UPGRADES } from './ships/defs';
import { berthsOf, fitting, KIND, SLOTS } from './ships/fittings';
import { newProgress, type Progress, S } from './state';

const KEY = 'brinewake:save:1';
const count = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.floor(v), 0, max) : 0);

// a saved sailor, with every field put back in range; null when it is not one at all
function sailor(v: unknown): Sailor | null {
    const s = v as Partial<Sailor> | null;
    if (!s || typeof s !== 'object' || typeof s.name !== 'string') return null;
    return {
        id: count(s.id, 1e9),
        name: s.name.slice(0, 40),
        skills: Object.fromEntries(SKILLS.map((k) => [k, count(s.skills?.[k], MAX_SKILL)])) as Record<Skill, number>,
        cost: count(s.cost, 1e6),
        share: typeof s.share === 'number' && Number.isFinite(s.share) ? clamp(s.share, 0, 0.2) : 0.02,
        post: isStation(s.post) ? s.post : null,
    };
}

// a saved list of sailors: no two with the same id (ids already in `taken` included)
function sailors(v: unknown, taken: Set<number>): Sailor[] {
    const out: Sailor[] = [];
    if (Array.isArray(v))
        for (const raw of v) {
            const s = sailor(raw);
            if (!s || taken.has(s.id)) continue;
            taken.add(s.id);
            out.push(s);
        }
    return out;
}

/** Reads the saved game, falling back to a fresh one if there is none or it does not parse. */
export function loadProgress(): Progress {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? reviveProgress(JSON.parse(raw)) : newProgress();
    } catch {
        return newProgress();
    }
}

/**
 * A career out of whatever was kept of one, with every field put back in range: a save read from
 * storage, or the host's career as it was sent to a hand in their crew. Anything that is not a
 * career at all comes back as a fresh one.
 */
export function reviveProgress(kept: unknown): Progress {
    const fresh = newProgress();
    try {
        if (!kept || typeof kept !== 'object') return fresh;
        const p = kept as Partial<Progress>;
        const cls = count(p.cls, CLASSES.length - 1);
        // only fittings the yard still sells are kept, and a slot only holds one that is owned
        const owned = [...fresh.owned];
        if (Array.isArray(p.owned)) for (const id of p.owned) if (typeof id === 'string' && fitting(id) && !owned.includes(id)) owned.push(id);
        const fit = fresh.fit;
        for (const slot of SLOTS) {
            const id = p.fit?.[slot];
            if (typeof id === 'string' && owned.includes(id) && fitting(id)?.kind === KIND[slot]) fit[slot] = id;
        }
        const levels = UPGRADES.map((_, i) => count(p.levels?.[i], maxLevel(i))),
            renown = count(p.renown, 1e6);
        // the company: one sailor to a station, and no more aboard than she has berths for
        const ids = new Set<number>(),
            crew = sailors(p.crew, ids),
            tavern = sailors(p.tavern, ids),
            nextId = Math.max(count(p.nextId, 1e9), 1, ...[...ids].map((id) => id + 1)),
            held = new Set<Station>();
        for (const s of crew) {
            if (s.post && held.has(s.post)) s.post = null;
            if (s.post) held.add(s.post);
        }
        const berthed = aboard(crew, berthsOf({ cls, levels, fit, crew }));
        for (const s of crew) if (!berthed.includes(s)) s.post = null;
        return {
            gold: count(p.gold, 1e9),
            cls,
            // a save from before hulls were kept: every hull up to hers was traded in on the way
            hulls: CLASSES.map((_, i) => i === 0 || i === cls || (Array.isArray(p.hulls) ? p.hulls[i] === true : i < cls)),
            levels,
            fit,
            owned,
            crew,
            tavern: tavern.length ? tavern : tavernful(nextId, infamyOf(renown)),
            nextId: nextId + TAVERN_SIZE,
            escorts: count(p.escorts, MAX_ESCORTS),
            renown,
            won: p.won === true,
            stats: { sunk: count(p.stats?.sunk, 1e9), plunder: count(p.stats?.plunder, 1e9), time: count(p.stats?.time, 1e9) },
        };
    } catch {
        return fresh;
    }
}

/** Writes the game to local storage. Storage can be unavailable (private windows); the game then simply does not persist. */
export function saveProgress() {
    // the drydock's career is a throwaway: the real one stays as it was left. So is the career a hand
    // in someone else's crew is shown: it is the host's, and theirs to keep.
    if (S.drydock || NET.client) return;
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
