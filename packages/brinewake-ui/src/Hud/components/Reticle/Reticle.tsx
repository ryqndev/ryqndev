import { hudSignals, RELOAD_STEPS } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo, useRef } from 'react';

import { useHud } from '../../../hooks/useHud';
import { useHudFrame } from '../../../hooks/useHudFrame';
import cn from './Reticle.module.scss';

/** Centre-screen feedback: the gun sight, the hit marker and the arc showing where fire is coming from. */
export const Reticle = memo(function Reticle() {
    const side = useHud((s) => s.side);
    const ready = useHud((s) => (s.side === 0 ? s.port : s.starboard) >= RELOAD_STEPS);
    const hit = useRef<HTMLDivElement>(null);
    const damage = useRef<HTMLDivElement>(null);
    // last values written to the DOM, so a frame with nothing new touches no styles
    const shown = useRef({ hit: 0, kill: false, dmg: 0, rot: 0 });

    useHudFrame(() => {
        const s = shown.current;
        if (hit.current) {
            if (s.hit !== hudSignals.hit) hit.current.style.opacity = String((s.hit = hudSignals.hit));
            if (s.kill !== hudSignals.hitKill) hit.current.classList.toggle(cn.kill, (s.kill = hudSignals.hitKill));
        }
        if (damage.current) {
            if (s.dmg !== hudSignals.dmg) damage.current.style.opacity = String((s.dmg = hudSignals.dmg));
            if (hudSignals.dmg > 0 && s.rot !== hudSignals.dmgRot) damage.current.style.transform = `rotate(${(s.rot = hudSignals.dmgRot)}deg)`;
        }
    });

    return (
        <>
            <div className={clsx(cn.sight, side < 0 ? cn.masked : ready ? cn.ready : cn.loading)}>
                <i className={cn.dot} />
                <div className={cn.ring} />
                <div className={cn.note}>{side < 0 ? 'guns will not bear' : side ? 'starboard' : 'port'}</div>
            </div>
            <div className={cn.hit} ref={hit}>
                <i />
                <i />
                <i />
                <i />
            </div>
            <div className={cn.damage} ref={damage}>
                <i />
            </div>
        </>
    );
});
