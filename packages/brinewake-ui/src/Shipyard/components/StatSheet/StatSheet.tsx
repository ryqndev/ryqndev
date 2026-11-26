import { type Build, CLASSES, fitted, type GunStats, maxRange, shipStats, type Slot } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo, useMemo } from 'react';

import cn from './StatSheet.module.scss';

interface StatSheetProps {
    /** the ship as she is */
    build: Build;
    /** the build being looked at, when there is one: the sheet then shows what would change */
    candidate: Build | null;
}

// how a change reads: nothing to say, glad of it, or sorry for it
const verdict = (now: number, next: number, moreIsBetter: boolean) => (Math.abs(next - now) < 1e-6 ? undefined : next > now === moreIsBetter ? cn.good : cn.bad);

interface GaugeProps {
    label: string;
    now: number;
    next: number;
    /** the value as a fraction of the longest the bar gets */
    scale(v: number): number;
    format(v: number): string;
}

// one of the ship's own figures: a bar that shows the change on top of what she has
const Gauge = ({ label, now, next, scale, format }: GaugeProps) => {
    const a = Math.min(1, scale(Math.min(now, next))),
        b = Math.min(1, scale(Math.max(now, next))),
        tone = verdict(now, next, true);
    return (
        <div className={cn.gauge}>
            <span className={cn.label}>{label}</span>
            <span className={cn.bar}>
                <i style={{ width: a * 100 + '%' }} />
                {tone && <i className={tone} style={{ left: a * 100 + '%', width: (b - a) * 100 + '%' }} />}
            </span>
            <span className={clsx(cn.value, tone)}>{format(next)}</span>
        </div>
    );
};

interface FigureProps {
    now: number;
    next: number;
    moreIsBetter?: boolean;
    format(v: number): string;
}

interface LineProps extends FigureProps {
    label: string;
}

// one figure about the company, with its name beside it
const Line = ({ label, now, next, moreIsBetter = true, format }: LineProps) => (
    <div className={cn.line}>
        <span className={cn.label}>{label}</span>
        <span className={clsx(cn.value, verdict(now, next, moreIsBetter))}>{format(next)}</span>
    </div>
);

// one figure of a battery
const Figure = ({ now, next, moreIsBetter = true, format }: FigureProps) => <td className={verdict(now, next, moreIsBetter)}>{format(next)}</td>;

const SIDES: Slot[] = ['port', 'starboard'];

/** The ship in figures. While an offer is being looked at it shows her as she would be, with every change marked. */
export const StatSheet = memo(function StatSheet({ build, candidate }: StatSheetProps) {
    const now = useMemo(() => shipStats(build), [build]);
    const next = useMemo(() => (candidate ? shipStats(candidate) : now), [candidate, now]);
    const shown = candidate ?? build,
        lines = fitted(shown, 'lines');

    // every row of the battery table reads the same way: the figure for port, then starboard
    const row = (label: string, of: (g: GunStats, guns: number) => number, format: (v: number) => string, moreIsBetter = true) => (
        <tr>
            <th>{label}</th>
            {SIDES.map((slot, i) => (
                <Figure format={format} key={slot} moreIsBetter={moreIsBetter} next={of(next.bat[i], next.guns)} now={of(now.bat[i], now.guns)} />
            ))}
        </tr>
    );

    return (
        <div className={cn.sheet}>
            <div className={cn.title}>
                <b>{CLASSES[shown.cls].name}</b>
                <span>
                    {lines.form ? lines.name + ' · ' : ''}
                    {next.guns} guns a side
                </span>
            </div>

            <Gauge format={(v) => String(Math.round(v))} label="Hull" next={next.hp} now={now.hp} scale={(v) => Math.sqrt(v / 1100)} />
            <Gauge format={(v) => v.toFixed(1)} label="Speed" next={next.speed} now={now.speed} scale={(v) => v / 24} />
            <Gauge format={(v) => String(Math.round(v * 100))} label="Handling" next={next.turn} now={now.turn} scale={(v) => v / 1.15} />
            <Gauge format={(v) => String(Math.round(v))} label="Hold" next={next.hold} now={now.hold} scale={(v) => Math.sqrt(v / 3600)} />

            <table className={cn.guns}>
                <thead>
                    <tr>
                        <th />
                        {SIDES.map((slot) => (
                            <th className={clsx(fitted(shown, slot) !== fitted(build, slot) && cn.changed)} key={slot}>
                                <span>{slot}</span>
                                {fitted(shown, slot).name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {row('Broadside', (g, guns) => g.dmg * guns, (v) => String(Math.round(v)))}
                    {row('Reload', (g) => g.reload, (v) => v.toFixed(1) + ' s', false)}
                    {row('Range', (g) => maxRange(g.shot), (v) => Math.round(v) + ' m')}
                    {row('Scatter', (g) => g.spread, (v) => '±' + (v * 100).toFixed(1) + '%', false)}
                </tbody>
            </table>

            <div className={cn.company}>
                <Line format={(v) => v + ' / ' + next.berths} label="Crew" next={next.aboard} now={now.aboard} />
                <Line format={(v) => Math.round(v * 100) + '%'} label="Their share" moreIsBetter={false} next={next.share} now={now.share} />
                <Line format={(v) => v.toFixed(2) + ' /s'} label="Repairs" next={next.mend} now={now.mend} />
                <Line format={(v) => '+' + Math.round((v - 1) * 100) + '%'} label="Bargain" next={next.bank} now={now.bank} />
            </div>
        </div>
    );
});
