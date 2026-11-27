import { COAT_CSS, hudSignals, POST, TAG_STRIDE } from '@ryqndev/brinewake-game';
import { useHudFrame } from '@ryqndev/kiln-ui';
import { memo, useRef } from 'react';

import { useHud } from '../../../hooks/useHud';
import cn from './Shipmates.module.scss';

const STATION = { [POST.NONE]: '', [POST.HELM]: 'wheel', [POST.GUN]: 'gun' };

interface ShipmatesProps {
    /** HUD zoom factor: name positions are computed in viewport pixels and must be un-scaled */
    zoom: number;
}

/** The crew of players, while sailing with friends: who is aboard and at what station, and a name over each of their heads. */
export const Shipmates = memo(function Shipmates({ zoom }: ShipmatesProps) {
    const net = useHud((s) => s.net);
    const shipmates = useHud((s) => s.shipmates);
    const tags = useRef<(HTMLDivElement | null)[]>([]);

    // world-anchored, so they move every frame: positioned straight on the DOM instead of through state
    useHudFrame(() => {
        const sig = hudSignals.tags;
        for (let i = 0; i < tags.current.length; i++) {
            const el = tags.current[i],
                o = i * TAG_STRIDE;
            if (!el) continue;
            const on = o + 2 < sig.length && sig[o + 2] > 0;
            el.style.opacity = on ? '1' : '0';
            if (on) el.style.transform = `translate(${((sig[o] * window.innerWidth) / zoom) | 0}px,${((sig[o + 1] * window.innerHeight) / zoom) | 0}px)`;
        }
    });

    if (net.role === 'off') return null;

    return (
        <>
            {shipmates.slice(1).map((mate, i) => (
                <div
                    className={cn.tag}
                    key={mate.id}
                    ref={(el) => {
                        tags.current[i] = el;
                    }}
                >
                    <span>
                        <i style={{ background: COAT_CSS[mate.id % COAT_CSS.length] }} />
                        {mate.name}
                    </span>
                </div>
            ))}
            <div className={cn.crew}>
                <div className={cn.label}>
                    Crew <b>{net.code}</b>
                </div>
                {shipmates.map((mate) => (
                    <div className={cn.mate} key={mate.id}>
                        <i style={{ background: COAT_CSS[mate.id % COAT_CSS.length] }} />
                        <span>{mate.name}</span>
                        <em>{STATION[mate.post as keyof typeof STATION]}</em>
                    </div>
                ))}
            </div>
        </>
    );
});
