import { RELOAD_STEPS } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Helm.module.scss';

const CANVAS = ['Furled', 'Slow', 'Half', 'Full'];

interface BatteryProps {
    name: string;
    /** reload progress, 0..RELOAD_STEPS */
    load: number;
    /** the camera is laying this side's guns */
    laid: boolean;
}

const Battery = memo(function Battery({ name, load, laid }: BatteryProps) {
    return (
        <div className={clsx(cn.battery, laid && cn.laid, load >= RELOAD_STEPS && cn.ready)}>
            <div className={cn.name}>{name}</div>
            <div className={cn.bar}>
                <div className={cn.fill} style={{ transform: `scaleX(${load / RELOAD_STEPS})` }} />
            </div>
        </div>
    );
});

/** The ship's orders at a glance: how much canvas is set, and the state of each broadside. */
export const Helm = memo(function Helm() {
    const sail = useHud((s) => s.sail);
    const port = useHud((s) => s.port);
    const starboard = useHud((s) => s.starboard);
    const side = useHud((s) => s.side);

    return (
        <div className={cn.helm}>
            <Battery laid={side === 0} load={port} name="Port" />
            <div className={cn.sails}>
                <div className={cn.pips}>
                    {CANVAS.map((name, i) => (
                        <i className={clsx(i > 0 && i <= sail && cn.set)} key={name} />
                    ))}
                </div>
                <div className={cn.name}>{CANVAS[sail]}</div>
            </div>
            <Battery laid={side === 1} load={starboard} name="Starboard" />
        </div>
    );
});
