import { memo } from 'react';

import cn from './RunStats.module.scss';

export type Stat = [value: string, label: string];

interface RunStatsProps {
    entries: readonly Stat[];
}

/** Formats seconds as m:ss. */
export const clock = (seconds: number) => ((seconds / 60) | 0) + ':' + String((seconds % 60) | 0).padStart(2, '0');

/** A row of tallies for the end-of-run screens. */
export const RunStats = memo(function RunStats({ entries }: RunStatsProps) {
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
