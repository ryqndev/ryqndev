import type { Hint } from '@ryqndev/rimefire-game';
import type { ReactNode } from 'react';

/** What each onboarding hint says. */
export const HINTS: Record<Hint, ReactNode> = {
    coat: (
        <>
            Hold <kbd>LMB</kbd> to coat a target in <kbd>GEL</kbd>
        </>
    ),
    swap: (
        <>
            <kbd>Q</kbd> swaps to the <kbd>STRIKER</kbd> — one spark lights the gel
        </>
    ),
    pylon: (
        <>
            Coat a frozen <kbd>PYLON ◆</kbd> then ignite it to thaw it
        </>
    ),
};
