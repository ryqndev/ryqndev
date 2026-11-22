import { hudSignals } from '@ryqndev/rimefire-game';
import clsx from 'clsx';
import { memo, useRef } from 'react';

import { useHud } from '../../../hooks/useHud';
import { useHudFrame } from '../../../hooks/useHudFrame';
import cn from './Reticle.module.scss';

/** Centre-screen feedback: the crosshair, hit marker, "no effect" notice and damage-direction arc. */
export const Reticle = memo(function Reticle() {
    const weapon = useHud((s) => s.weapon);
    const hit = useRef<HTMLDivElement>(null);
    const resist = useRef<HTMLDivElement>(null);
    const damage = useRef<HTMLDivElement>(null);
    // last values written to the DOM, so a frame with nothing new touches no styles
    const shown = useRef({ hit: 0, kill: false, resist: 0, dmg: 0, rot: 0 });

    useHudFrame(() => {
        const s = shown.current;
        if (hit.current) {
            if (s.hit !== hudSignals.hit) hit.current.style.opacity = String((s.hit = hudSignals.hit));
            if (s.kill !== hudSignals.hitKill) hit.current.classList.toggle(cn.kill, (s.kill = hudSignals.hitKill));
        }
        if (resist.current && s.resist !== hudSignals.resist) resist.current.style.opacity = String((s.resist = hudSignals.resist));
        if (damage.current) {
            if (s.dmg !== hudSignals.dmg) damage.current.style.opacity = String((s.dmg = hudSignals.dmg));
            if (hudSignals.dmg > 0 && s.rot !== hudSignals.dmgRot) damage.current.style.transform = `rotate(${(s.rot = hudSignals.dmgRot)}deg)`;
        }
    });

    return (
        <>
            <div className={clsx(cn.crosshair, weapon ? cn.striker : cn.gel)}>
                <i className={cn.dot} />
                <i className={cn.top} />
                <i className={cn.bottom} />
                <i className={cn.left} />
                <i className={cn.right} />
                <div className={cn.ring} />
            </div>
            <div className={cn.hit} ref={hit}>
                <i />
                <i />
                <i />
                <i />
            </div>
            <div className={cn.resist} ref={resist}>
                NO EFFECT — GEL FIRST
            </div>
            <div className={cn.damage} ref={damage}>
                <i />
            </div>
        </>
    );
});
