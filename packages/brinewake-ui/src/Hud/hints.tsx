import type { Hint } from '@ryqndev/brinewake-game';
import type { ReactNode } from 'react';

/** What each onboarding hint says. */
export const HINTS: Record<Hint, ReactNode> = {
    sail: (
        <>
            <kbd>W</kbd> lets out sail, <kbd>S</kbd> takes it in · steer with <kbd>A</kbd> <kbd>D</kbd>
        </>
    ),
    aim: (
        <>
            Look out over either beam and hold <kbd>LMB</kbd> to fire that broadside
        </>
    ),
    plunder: (
        <>
            Sink a <kbd>MERCHANTMAN</kbd> — gold on the chart — and sail through what floats up
        </>
    ),
    bank: (
        <>
            Plunder in the hold goes down with the ship. Bank it at <kbd>PORT ⚓</kbd>
        </>
    ),
    dock: (
        <>
            <kbd>F</kbd> drops anchor: bank the hold, mend the hull, visit the shipyard
        </>
    ),
    full: (
        <>
            The hold is full. Bank it at <kbd>PORT ⚓</kbd>
        </>
    ),
};
