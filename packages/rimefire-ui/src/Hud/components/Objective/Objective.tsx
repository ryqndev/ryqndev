import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Objective.module.scss';

const OBJECTIVES = ['Reignite the three heat pylons', 'Hold out — something is waking', 'Destroy the Colossus', 'Station reignited'];
const PYLONS = [0, 1, 2];

export const Objective = memo(function Objective() {
    const objective = useHud((s) => s.objective);
    const lit = useHud((s) => s.lit);

    return (
        <div className={cn.objective}>
            <div className={cn.label}>Objective</div>
            <div className={cn.text}>{OBJECTIVES[objective]}</div>
            <div className={cn.pips}>
                {PYLONS.map((i) => (
                    <i className={clsx(i < lit && cn.lit)} key={i} />
                ))}
            </div>
        </div>
    );
});
