import clsx from 'clsx';
import { memo, type ReactNode } from 'react';

import { useHudCore } from '../hud/HudContext';
import cn from './Tip.module.scss';

interface TipProps {
    /** what each of the game's hints says, by name; wrap key names in <kbd> */
    hints: Record<string, ReactNode>;
}

/** Onboarding hints, raised by name with hud.tip(), and short status toasts. */
export const Tip = memo(function Tip({ hints }: TipProps) {
    const tip = useHudCore((s) => s.tip);
    const on = useHudCore((s) => s.tipOn);

    return <div className={clsx(cn.tip, on && cn.on)}>{tip.kind === 'toast' ? tip.text : hints[tip.kind]}</div>;
});
