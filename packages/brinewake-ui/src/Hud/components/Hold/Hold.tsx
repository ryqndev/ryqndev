import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Hold.module.scss';

/** Plunder aboard (lost if she sinks) against what the hold takes, and the gold already safe ashore. */
export const Hold = memo(function Hold() {
    const hold = useHud((s) => s.hold);
    const cap = useHud((s) => s.cap);
    const gold = useHud((s) => s.gold);

    return (
        <div className={clsx(cn.hold, hold >= cap && cn.full)}>
            <div className={cn.label}>Hold</div>
            <div className={cn.value}>
                {hold}
                <span>/ {cap}</span>
            </div>
            <div className={cn.bar}>
                <div className={cn.fill} style={{ transform: `scaleX(${Math.min(1, hold / cap)})` }} />
            </div>
            <div className={cn.banked}>
                Banked <b>{gold}</b>
            </div>
        </div>
    );
});
