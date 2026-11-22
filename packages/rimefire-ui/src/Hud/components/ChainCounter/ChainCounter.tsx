import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './ChainCounter.module.scss';

/** Running count of detonations in the current chain reaction. */
export const ChainCounter = memo(function ChainCounter() {
    const chain = useHud((s) => s.chain);
    const on = useHud((s) => s.chainOn);

    return (
        <div className={clsx(cn.chain, on && cn.on)}>
            {/* keyed by the count so the pop animation replays on every increment */}
            <div className={cn.value} key={chain}>
                ×{chain}
            </div>
            <div className={cn.label}>Chain reaction</div>
        </div>
    );
});
