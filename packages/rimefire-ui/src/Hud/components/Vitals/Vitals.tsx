import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Vitals.module.scss';

const LOW_HEALTH = 30;

export const Vitals = memo(function Vitals() {
    const hp = useHud((s) => s.hp);

    return (
        <div className={clsx(cn.vitals, hp <= LOW_HEALTH && cn.low)}>
            <div className={cn.label}>Vitals</div>
            <div className={cn.value}>{hp}</div>
            <div className={cn.bar}>
                <div className={cn.fill} style={{ transform: `scaleX(${hp / 100})` }} />
            </div>
        </div>
    );
});
