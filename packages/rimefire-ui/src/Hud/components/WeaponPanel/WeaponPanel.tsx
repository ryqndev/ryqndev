import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './WeaponPanel.module.scss';

export const WeaponPanel = memo(function WeaponPanel() {
    const weapon = useHud((s) => s.weapon);
    const gel = useHud((s) => s.gel);
    const dry = useHud((s) => s.dry);
    const heat = useHud((s) => s.heat);

    return (
        <div className={cn.panel}>
            <div className={clsx(cn.card, cn.gel, weapon === 0 && cn.active, dry && cn.dry)}>
                <div className={cn.name}>
                    GELCASTER<span>1</span>
                </div>
                <div className={cn.bar}>
                    <div className={cn.fill} style={{ transform: `scaleX(${gel / 100})` }} />
                </div>
            </div>
            <div className={clsx(cn.card, cn.striker, weapon === 1 && cn.active)}>
                <div className={cn.name}>
                    STRIKER<span>2</span>
                </div>
                <div className={cn.bar}>
                    <div className={cn.fill} style={{ transform: `scaleX(${1 - heat / 20})` }} />
                </div>
            </div>
        </div>
    );
});
