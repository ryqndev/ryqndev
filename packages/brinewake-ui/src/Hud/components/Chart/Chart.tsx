import { BLIP, BLIP_STRIDE, CHART_SPAN, chartImage, hudSignals, portPosition } from '@ryqndev/brinewake-game';
import { useHudFrame } from '@ryqndev/kiln-ui';
import { memo, useRef } from 'react';

import cn from './Chart.module.scss';

/** Side of the chart in CSS pixels, and the backing-store scale it is drawn at. */
const SIZE = 172;
const SCALE = 2;
const PX = SIZE * SCALE;
// colour of each kind of blip, indexed by BLIP
const COLOURS: Record<number, string> = {
    [BLIP.NAVY]: '#ff5a48',
    [BLIP.TRADE]: '#f0c35a',
    [BLIP.FRIEND]: '#8dff9a',
    [BLIP.LOOT]: '#ffe9a8',
    [BLIP.FLAGSHIP]: '#ff2d6a',
};

// the islands never move: paint them once into their own canvas and stamp that every frame
function paintIslands(): HTMLCanvasElement {
    const layer = document.createElement('canvas');
    layer.width = layer.height = PX;
    layer.getContext('2d')!.putImageData(new ImageData(chartImage(PX), PX, PX), 0, 0);
    return layer;
}

/** The chart: islands, the home port, every ship and crate afloat, and the player's own heading. */
export const Chart = memo(function Chart() {
    const canvas = useRef<HTMLCanvasElement>(null);
    const islands = useRef<HTMLCanvasElement | null>(null);
    const tick = useRef(0);

    // drawn straight to a canvas from the frame signals; every other frame is plenty for a chart
    useHudFrame(() => {
        if (tick.current++ & 1) return;
        const ctx = canvas.current?.getContext('2d');
        if (!ctx) return;
        // frames only arrive once the world exists, so the island layer can be built on the first one
        islands.current ??= paintIslands();
        const at = (world: number) => (world / CHART_SPAN + 0.5) * PX;
        ctx.clearRect(0, 0, PX, PX);
        ctx.drawImage(islands.current, 0, 0);

        const [px, pz] = portPosition();
        ctx.fillStyle = '#f0c35a';
        ctx.font = `${11 * SCALE}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚓', at(px), at(pz));

        const { blips, blipCount, self } = hudSignals;
        for (let i = 0; i < blipCount; i++) {
            const o = i * BLIP_STRIDE,
                kind = blips[o + 2],
                r = (kind === BLIP.LOOT ? 1.2 : kind === BLIP.FLAGSHIP ? 3.4 : 2.4) * SCALE;
            ctx.fillStyle = COLOURS[kind];
            ctx.fillRect(at(blips[o]) - r / 2, at(blips[o + 1]) - r / 2, r, r);
        }
        // the player: an arrowhead pointing along the ship's heading
        ctx.save();
        ctx.translate(at(self[0]), at(self[1]));
        ctx.rotate(-self[2]);
        ctx.beginPath();
        ctx.moveTo(0, -5.5 * SCALE);
        ctx.lineTo(3.6 * SCALE, 4 * SCALE);
        ctx.lineTo(0, 2 * SCALE);
        ctx.lineTo(-3.6 * SCALE, 4 * SCALE);
        ctx.closePath();
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.restore();
    });

    return (
        <div className={cn.chart}>
            <canvas height={PX} ref={canvas} style={{ width: SIZE, height: SIZE }} width={PX} />
        </div>
    );
});
