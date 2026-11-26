import clsx from 'clsx';
import { memo } from 'react';

import cn from './Gauge.module.scss';

interface GaugeProps {
    label: string;
    /** the reading, printed large */
    value: number;
    /** small print after the reading, such as "/ 100" */
    suffix?: string;
    /** how full the bar is, 0..1 */
    fraction: number;
    /** turns the reading and the bar red */
    low?: boolean;
    /** places and sizes the gauge; the game's own class */
    className?: string;
}

/** A labelled reading over a thin bar: health, hull, and the like. */
export const Gauge = memo(function Gauge({ label, value, suffix, fraction, low = false, className }: GaugeProps) {
    return (
        <div className={clsx(className, low && cn.low)}>
            <div className={cn.label}>{label}</div>
            <div className={cn.value}>
                {value}
                {suffix && <span>{suffix}</span>}
            </div>
            <div className={cn.bar}>
                <div className={cn.fill} style={{ transform: `scaleX(${fraction})` }} />
            </div>
        </div>
    );
});
