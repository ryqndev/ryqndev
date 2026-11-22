import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './RunStats.module.scss';

const clock = (seconds: number) => ((seconds / 60) | 0) + ':' + String((seconds % 60) | 0).padStart(2, '0');

/** End-of-run summary shown on the death and victory screens. */
export const RunStats = memo(function RunStats() {
    const stats = useHud((s) => s.stats);
    const entries: [value: string, label: string][] = [
        [clock(stats.time), 'Time'],
        [String(stats.det), 'Detonations'],
        ['×' + stats.best, 'Best chain'],
        [String(stats.kills), 'Shattered'],
    ];

    return (
        <div className={cn.stats}>
            {entries.map(([value, label]) => (
                <div key={label}>
                    <div className={cn.value}>{value}</div>
                    <span className={cn.label}>{label}</span>
                </div>
            ))}
        </div>
    );
});
