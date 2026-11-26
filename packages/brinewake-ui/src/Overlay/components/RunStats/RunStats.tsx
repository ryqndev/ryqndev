import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './RunStats.module.scss';

const clock = (seconds: number) => ((seconds / 60) | 0) + ':' + String((seconds % 60) | 0).padStart(2, '0');

/** The career so far, shown when a ship is lost and when the admiral is beaten. */
export const RunStats = memo(function RunStats() {
    const stats = useHud((s) => s.stats);
    const entries: [value: string, label: string][] = [
        [clock(stats.time), 'Under sail'],
        [String(stats.sunk), 'Ships sunk'],
        [String(stats.plunder), 'Gold banked'],
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
