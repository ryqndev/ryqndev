// What the shipyard's parts share: the player's build and purse, a way to try another build on,
// and how a fitting's numbers are put into words.
import { type Build, type Fitting, type Sailor, SLOTS } from '@ryqndev/brinewake-game';
import { createContext, useContext, useEffect, useId, useRef } from 'react';

export interface Yard {
    /** the ship as she really is */
    build: Build;
    gold: number;
    /** ids of the fittings owned, and the hulls owned by class */
    owned: string[];
    hulls: boolean[];
    /** recruits waiting at the tavern; the company itself is part of the build */
    tavern: Sailor[];
    /**
     * Shows another build on the ship and in the figures, as an offer is looked at. Null takes it
     * off again, unless a different offer (told apart by `who`) has been looked at since: the
     * browser does not promise to report leaving one before entering the next.
     *
     * Offers call this from onMouseOver, not onMouseEnter. React drops the enter when the pointer
     * comes from an element that has just been removed, which is what a buy button is the moment
     * it is clicked. Over fires for every child crossed, so asking again for the same offer is free.
     */
    tryOn(who: string, build: Build | null): void;
}

export const YardContext = createContext<Yard>(null!);
export const useYard = () => useContext(YardContext);

/** True when two builds make the same ship. */
export const sameBuild = (a: Build, b: Build) =>
    a.cls === b.cls &&
    a.levels.every((l, i) => l === b.levels[i]) &&
    SLOTS.every((slot) => a.fit[slot] === b.fit[slot]) &&
    a.crew.length === b.crew.length &&
    a.crew.every((s, i) => s.id === b.crew[i].id && s.post === b.crew[i].post);

/**
 * Handlers for one offer: looking at it tries its build on, and looking away takes it off. If what
 * it offers changes while it is being looked at (it was just bought, and now offers the next
 * level), the ship follows.
 */
export function useTryOn(build: Build | null) {
    const { tryOn } = useYard();
    const who = useId();
    const looking = useRef(false);
    useEffect(() => {
        if (looking.current) tryOn(who, build);
    }, [tryOn, who, build]);
    return {
        look() {
            looking.current = true;
            if (build) tryOn(who, build);
        },
        away() {
            looking.current = false;
            tryOn(who, null);
        },
    };
}

/** How an offer stands: mounted now, owned and ready to mount, or still to be bought. */
export type Standing = 'fitted' | 'owned' | 'sale';

/** One thing a fitting does, and whether the player will be glad of it. */
export interface Effect {
    text: string;
    good: boolean;
}

const percent = (m: number) => (m > 1 ? '+' : '−') + Math.round(Math.abs(m - 1) * 100) + '%';

/**
 * A fitting's figures, as the list of changes it makes. Empty for the stock ones. `guns` is how
 * many more guns a side it would have her mount (fewer, if negative), for the fittings that change that.
 */
export function effectsOf(f: Fitting, guns = 0): Effect[] {
    const out: Effect[] = [];
    if (guns) out.push({ text: (guns > 0 ? '+' : '−') + Math.abs(guns) + (Math.abs(guns) > 1 ? ' guns a side' : ' gun a side'), good: guns > 0 });
    const add = (m: number | undefined, what: string, moreIsBetter = true) => {
        if (m !== undefined && m !== 1) out.push({ text: percent(m) + ' ' + what, good: m > 1 === moreIsBetter });
    };
    add(f.dmg, 'shot weight');
    add(f.reload, 'reload time', false);
    // range goes with the square of the muzzle speed
    add(f.shot && f.shot * f.shot, 'range');
    add(f.spread, 'scatter', false);
    add(f.hp, 'hull');
    add(f.speed, 'speed');
    add(f.turn, 'handling');
    add(f.hold, 'hold');
    add(f.bank, 'plunder banked');
    if (f.berths) out.push({ text: '+' + f.berths + ' berths', good: true });
    return out;
}

/** A tint in linear light, as the colour it comes out on screen. `under` is what it is laid over. */
export function tintCss(tint: number[], under = [1, 1, 1]) {
    const c = tint.map((v, i) => Math.round(255 * Math.pow(Math.min(1, v * under[i]), 1 / 2.2)));
    return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}
