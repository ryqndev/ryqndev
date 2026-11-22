import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './BossBar.module.scss';

export const BossBar = memo(function BossBar() {
    const on = useHud((s) => s.bossOn);
    const hp = useHud((s) => s.bossHp);
    const armored = useHud((s) => s.bossArmored);
    const nodes = useHud((s) => s.nodes);

    return (
        <div className={clsx(cn.boss, on && cn.on, armored && cn.armored)}>
            <div className={cn.label}>Colossus</div>
            <div className={cn.bar}>
                <div className={cn.fill} style={{ transform: `scaleX(${hp / 200})` }} />
            </div>
            <div className={cn.nodes}>
                {nodes.map((alive, i) => (
                    <i className={clsx(!alive && cn.broken)} key={i} />
                ))}
            </div>
        </div>
    );
});
