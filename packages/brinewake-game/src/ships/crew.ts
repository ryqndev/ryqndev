// The ship's company: sailors hired at the tavern, each good at some things, posted to the
// stations where that counts. A sailor aboard takes a berth and a share of what is banked.
import { clamp } from '@ryqndev/kiln-math';

/** What a sailor can be good at, rated 0 (no hand for it) to MAX_SKILL. */
export type Skill = 'gunnery' | 'helm' | 'sailing' | 'carpentry' | 'trade';
export const SKILLS: Skill[] = ['gunnery', 'helm', 'sailing', 'carpentry', 'trade'];
export const MAX_SKILL = 5;

/** A job aboard. One sailor holds each, and it is only as well done as she is skilled at it. */
export type Station = 'helm' | 'sails' | 'port' | 'starboard' | 'carpenter' | 'purser';

export interface StationDef {
    id: Station;
    name: string;
    /** the skill the job calls for */
    skill: Skill;
    /** what filling it does, as the yard puts it */
    does: string;
}

export const STATIONS: StationDef[] = [
    { id: 'helm', name: 'Helm', skill: 'helm', does: 'A steady hand on the wheel brings her round quicker.' },
    { id: 'sails', name: 'Sailing master', skill: 'sailing', does: 'Trims every sail to the wind and finds her another knot.' },
    { id: 'port', name: 'Port gun captain', skill: 'gunnery', does: 'Drills the port battery: faster broadsides, laid truer.' },
    { id: 'starboard', name: 'Starboard gun captain', skill: 'gunnery', does: 'Drills the starboard battery: faster broadsides, laid truer.' },
    { id: 'carpenter', name: 'Carpenter', skill: 'carpentry', does: 'Plugs shot holes at sea, so the hull mends as she sails.' },
    { id: 'purser', name: 'Purser', skill: 'trade', does: 'Drives a harder bargain for the plunder at the quay.' },
];
const STATION = new Map(STATIONS.map((s) => [s.id, s]));
export const stationDef = (id: Station) => STATION.get(id)!;
export const isStation = (v: unknown): v is Station => typeof v === 'string' && STATION.has(v as Station);

/** What each point of skill at a station is worth. */
export const POST = {
    /** turn rate gained at the helm */
    turn: 0.06,
    /** speed gained under a sailing master */
    speed: 0.03,
    /** reload time and scatter a gun captain takes off her battery */
    reload: 0.06,
    spread: 0.08,
    /** fraction of the hull a carpenter mends each second */
    mend: 0.0015,
    /** gold a purser adds to what is banked */
    bank: 0.05,
};

export interface Sailor {
    /** stable for the life of a save */
    id: number;
    name: string;
    skills: Record<Skill, number>;
    /** gold to hire her */
    cost: number;
    /** the fraction of everything banked that she takes while she is aboard */
    share: number;
    /** the station she holds, or null when she is ashore waiting for one */
    post: Station | null;
}

/** However good the company, the captain keeps at least this much of what is banked. */
const MAX_SHARE = 0.6;
/** Recruits waiting at the tavern at any one time. */
export const TAVERN_SIZE = 5;

/**
 * The sailors actually aboard: those with a station, as far as the berths go. The ones hired
 * first keep their berths when a smaller ship cannot take everyone.
 */
export const aboard = (crew: Sailor[], berths: number) => crew.filter((s) => s.post).slice(0, berths);

/** How well a station is manned by the sailors aboard: the skill of whoever holds it, or 0. */
export function manning(company: Sailor[], station: Station) {
    const s = company.find((c) => c.post === station);
    return s ? s.skills[stationDef(station).skill] : 0;
}

/** The fraction of what is banked that goes to the sailors aboard. */
export const sharesOf = (company: Sailor[]) => Math.min(MAX_SHARE, company.reduce((sum, s) => sum + s.share, 0));

/**
 * A company with one sailor posted to a station (or stood down, with null), as a new list. Whoever
 * held the station is stood down. If she is not already aboard and there is no berth left for
 * her, nothing changes: `crew` itself is returned.
 */
export function withPost(crew: Sailor[], sailor: Sailor, station: Station | null, berths: number): Sailor[] {
    const next = crew.map((s) => (s.id === sailor.id ? s : s.post === station && station ? { ...s, post: null } : s));
    if (!next.some((s) => s.id === sailor.id)) next.push(sailor);
    const others = next.filter((s) => s.post && s.id !== sailor.id).length;
    if (station && others >= berths) return crew;
    return next.map((s) => (s.id === sailor.id ? { ...s, post: station } : s));
}

/** What a sailor of rating `r` does at a station, in the yard's words. Empty when she has no hand for it. */
export function postEffects(station: Station, r: number): string[] {
    if (r <= 0) return [];
    const pct = (v: number) => Math.round(v * r * 100) + '%';
    switch (station) {
        case 'helm':
            return ['+' + pct(POST.turn) + ' handling'];
        case 'sails':
            return ['+' + pct(POST.speed) + ' speed'];
        case 'port':
        case 'starboard':
            return ['−' + pct(POST.reload) + ' reload time', '−' + pct(POST.spread) + ' scatter'];
        case 'carpenter':
            return ['mends ' + (POST.mend * r * 100).toFixed(2) + '% of the hull a second'];
        case 'purser':
            return ['+' + pct(POST.bank) + ' gold banked'];
    }
}

// ---- the tavern ----
const FIRST = ['Nell', 'Tobias', 'Marisol', 'Jory', 'Agnes', 'Kwame', 'Ines', 'Bartholomew', 'Sunniva', 'Emeric', 'Odalys', 'Fitch', 'Rosalind', 'Dov', 'Calla', 'Anselm', 'Yara', 'Gideon', 'Maeve', 'Lucan', 'Bettina', 'Osric', 'Tamsin', 'Hale'];
const LAST = ['Marlowe', 'Quill', 'Ashdown', 'Pennywhistle', 'Okoro', 'Thackery', 'Vane', 'Holloway', 'Brisco', 'Fairweather', 'Tolliver', 'Greaves', 'Sallow', 'Dunmore', 'Pike', 'Hartigan', 'Wren', 'Castellane', 'Rooke', 'Mallory', 'Stroud', 'Barrow', 'Lockhart', 'Finch'];
const pick = <T>(list: T[]) => list[(Math.random() * list.length) | 0];

/**
 * Someone looking for a ship, with `skill` as her trade. The more infamous the captain, the
 * better the hands who want to sail with them.
 */
export function recruit(id: number, skill: Skill, infamy: number): Sailor {
    const x = Math.random() - 0.04 * infamy,
        best = x < 0.05 ? 5 : x < 0.2 ? 4 : x < 0.5 ? 3 : x < 0.85 ? 2 : 1;
    const skills = Object.fromEntries(SKILLS.map((k) => [k, 0])) as Record<Skill, number>;
    skills[skill] = best;
    // more than half of them picked up a second trade along the way
    let second = 0;
    if (Math.random() < 0.55) {
        const other = pick(SKILLS.filter((k) => k !== skill));
        second = skills[other] = clamp(best - 1 - ((Math.random() * 2) | 0), 1, MAX_SKILL);
    }
    return {
        id,
        name: pick(FIRST) + ' ' + pick(LAST),
        skills,
        cost: Math.round(7 * (best * best + 0.5 * second * second)) * 10,
        share: (1 + best + 0.5 * second) / 100,
        post: null,
    };
}

/** A fresh set of faces at the tavern: one for every trade, in no particular order. `nextId` is the first free id. */
export function tavernful(nextId: number, infamy: number): Sailor[] {
    const trades = [...SKILLS].sort(() => Math.random() - 0.5);
    return Array.from({ length: TAVERN_SIZE }, (_, i) => recruit(nextId + i, trades[i % trades.length], infamy));
}
