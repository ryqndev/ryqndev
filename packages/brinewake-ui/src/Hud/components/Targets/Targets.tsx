import { hudSignals, MAX_TARGETS, TARGET_STRIDE } from '@ryqndev/brinewake-game';
import { useHudFrame } from '@ryqndev/kiln-ui';
import { memo, useRef } from 'react';

import cn from './Targets.module.scss';

interface TargetsProps {
    /** HUD zoom factor: marker positions are computed in viewport pixels and must be un-scaled */
    zoom: number;
}

// bar colour by team: 1 navy, 2 merchant
const TEAM_CLASS = ['', cn.navy, cn.trade];

/**
 * Hull bars floating over the ships and forts near enough to fight, with a thinner bar under one for
 * the hands left on her deck once grapeshot has begun to thin them. A fixed pool of elements, moved every frame.
 */
export const Targets = memo(function Targets({ zoom }: TargetsProps) {
    const bars = useRef<(HTMLDivElement | null)[]>([]);
    const fills = useRef<(HTMLDivElement | null)[]>([]);
    const crews = useRef<(HTMLDivElement | null)[]>([]);

    useHudFrame(() => {
        const w = window.innerWidth,
            h = window.innerHeight,
            { targets, targetCount } = hudSignals;
        for (let i = 0; i < MAX_TARGETS; i++) {
            const bar = bars.current[i],
                fill = fills.current[i];
            if (!bar || !fill) continue;
            if (i >= targetCount) {
                if (bar.style.opacity !== '0') bar.style.opacity = '0';
                continue;
            }
            const o = i * TARGET_STRIDE;
            bar.style.opacity = '1';
            bar.style.transform = `translate(${((targets[o] * w) / zoom) | 0}px,${((targets[o + 1] * h) / zoom) | 0}px)`;
            fill.style.transform = `scaleX(${Math.max(0, targets[o + 2]).toFixed(3)})`;
            const team = TEAM_CLASS[targets[o + 3]];
            if (fill.className !== `${cn.fill} ${team}`) fill.className = `${cn.fill} ${team}`;
            // the hands left on her deck show only once she has begun to lose them
            const crew = crews.current[i],
                hands = targets[o + 4];
            if (crew) {
                crew.style.opacity = hands < 0.999 ? '1' : '0';
                crew.firstElementChild!.setAttribute('style', `transform:scaleX(${Math.max(0, hands).toFixed(3)})`);
            }
        }
    });

    return (
        <>
            {Array.from({ length: MAX_TARGETS }, (_, i) => (
                <div
                    className={cn.target}
                    key={i}
                    ref={(el) => {
                        bars.current[i] = el;
                    }}
                >
                    <div className={cn.bar}>
                        <div
                            className={cn.fill}
                            ref={(el) => {
                                fills.current[i] = el;
                            }}
                        />
                    </div>
                    <div
                        className={cn.crew}
                        ref={(el) => {
                            crews.current[i] = el;
                        }}
                    >
                        <div />
                    </div>
                </div>
            ))}
        </>
    );
});
