import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Hull.module.scss';

/** Fraction of the hull left below which the gauge turns red. */
const HOLED = 0.3;

/** How much of the ship is left. Repaired for free whenever she docks. */
export const Hull = memo(function Hull() {
    const hp = useHud((s) => s.hp);
    const max = useHud((s) => s.maxHp);

    return (
        <div className={clsx(cn.hull, hp <= max * HOLED && cn.low)}>
            <div className={cn.label}>Hull</div>
            <div className={cn.value}>
                {hp}
                <span>/ {max}</span>
            </div>
            <div className={cn.bar}>
                <div className={cn.fill} style={{ transform: `scaleX(${hp / max})` }} />
            </div>
        </div>
    );
});
