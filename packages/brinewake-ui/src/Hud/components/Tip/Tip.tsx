import type { TipKind } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo, type ReactNode } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Tip.module.scss';

const HINTS: Record<Exclude<TipKind, 'toast'>, ReactNode> = {
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

/** Onboarding hints and short status toasts (graphics quality, sensitivity, the navy's moves). */
export const Tip = memo(function Tip() {
    const tip = useHud((s) => s.tip);
    const on = useHud((s) => s.tipOn);

    return <div className={clsx(cn.tip, on && cn.on)}>{tip.kind === 'toast' ? tip.text : HINTS[tip.kind]}</div>;
});
