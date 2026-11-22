import type { TipKind } from '@ryqndev/rimefire-game';
import clsx from 'clsx';
import { memo, type ReactNode } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Tip.module.scss';

const HINTS: Record<Exclude<TipKind, 'toast'>, ReactNode> = {
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

/** Onboarding hints and short status toasts (graphics quality, sensitivity). */
export const Tip = memo(function Tip() {
    const tip = useHud((s) => s.tip);
    const on = useHud((s) => s.tipOn);

    return <div className={clsx(cn.tip, on && cn.on)}>{tip.kind === 'toast' ? tip.text : HINTS[tip.kind]}</div>;
});
