import { fitOut, fittingsOf, sigilShape, type Slot } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { memo, useEffect, useRef } from 'react';

import { tintCss, useYard } from '../../yard';
import cn from './Swatches.module.scss';

interface SwatchesProps {
    /** the slot being dressed, and the kind of fitting it takes */
    slot: 'paint' | 'cloth' | 'sigil';
    /** the finish that is setting this colour for now, if one is: the choice here waits until it comes off */
    setBy?: string;
}

// what each tint is laid over: paint goes on bare, sailcloth dyes the weave
const UNDER: Record<string, number[]> = { paint: [1, 1, 1], cloth: [0.93, 0.9, 0.8] };

// a sigil drawn small, by asking its shape about every pixel (four times over, for a clean edge)
const SigilChip = memo(function SigilChip({ index }: { index: number }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = canvas.current!,
            ctx = c.getContext('2d'),
            shape = sigilShape(index);
        if (!ctx) return;
        const { width: w, height: h } = c,
            img = ctx.createImageData(w, h),
            half = (h / 2) * 0.86;
        for (let py = 0; py < h; py++)
            for (let px = 0; px < w; px++) {
                let hit = 0;
                if (shape) for (const [dx, dy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) if (shape((px + dx - w / 2) / half, -(py + dy - h / 2) / half)) hit++;
                const o = (py * w + px) * 4;
                img.data[o] = 240;
                img.data[o + 1] = 195;
                img.data[o + 2] = 90;
                img.data[o + 3] = hit * 63.75;
            }
        ctx.putImageData(img, 0, 0);
    }, [index]);
    return <canvas height={76} ref={canvas} width={140} />;
});

/** A row of choices for one slot: colours, or sigils. Looking at one shows it on the ship; clicking wears it, buying it first if need be. */
export const Swatches = memo(function Swatches({ slot, setBy }: SwatchesProps) {
    const { build, gold, owned, tryOn } = useYard();
    const worn = build.fit[slot];

    if (setBy) return <p className={cn.setBy}>Set by the {setBy} finish. Go back to bare timber to choose your own.</p>;

    return (
        <div className={cn.swatches}>
            {fittingsOf(slot satisfies Slot).map((f) => {
                const mine = owned.includes(f.id);
                const look = () => tryOn(f.id, { ...build, fit: { ...build.fit, [slot]: f.id } });
                const away = () => tryOn(f.id, null);
                return (
                    <button
                        className={clsx(cn.swatch, f.id === worn && cn.worn)}
                        disabled={!mine && gold < f.cost}
                        key={f.id}
                        onBlur={away}
                        onClick={() => fitOut(slot, f.id)}
                        onFocus={look}
                        onMouseLeave={away}
                        onMouseOver={look}
                    >
                        {f.tint ? <i style={{ background: tintCss(f.tint, UNDER[slot]) }} /> : <SigilChip index={f.sigil ?? 0} />}
                        <span className={cn.name}>{f.name}</span>
                        <span className={clsx(cn.state, !mine && cn.price)}>{f.id === worn ? 'Worn' : mine ? 'Owned' : f.cost}</span>
                    </button>
                );
            })}
        </div>
    );
});
