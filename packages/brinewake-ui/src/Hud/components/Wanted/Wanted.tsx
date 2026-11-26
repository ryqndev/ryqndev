import { INFAMY } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Wanted.module.scss';

const STANDING = ['Unknown', 'Known raider', 'Wanted', 'Scourge of the lanes', 'Enemy of the Crown', 'Hunted by the Admiral'];
const LEVELS = INFAMY.length - 1;

/** The player's infamy: it rises with every ship sunk, and the navy answers each level with more. */
export const Wanted = memo(function Wanted() {
    const infamy = useHud((s) => s.infamy);
    const wanted = useHud((s) => s.wanted);

    return (
        <div className={cn.wanted}>
            <div className={cn.label}>Infamy</div>
            <div className={cn.pips}>
                {Array.from({ length: LEVELS }, (_, i) => (
                    <i className={clsx(i < infamy && cn.on)} key={i} />
                ))}
            </div>
            <div className={cn.standing}>{STANDING[infamy]}</div>
            <div className={cn.bar}>
                <div className={cn.fill} style={{ transform: `scaleX(${wanted / 10})` }} />
            </div>
        </div>
    );
});
