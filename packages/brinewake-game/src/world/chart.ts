import { WORLD } from '@ryqndev/brinewake-renderer';
import { clamp } from '@ryqndev/rimefire-math';

import { height } from './terrain';
import { W } from './world';

/** Width in metres of the square the chart covers, centred on the world origin. */
export const CHART_SPAN = 2 * WORLD;

/** World position of the home port, as [x, z]. Valid once the game has mounted. */
export const portPosition = (): [number, number] => [W.port.x, W.port.z];

/**
 * A chart of the islands for the HUD: `size` x `size` RGBA pixels covering the same square as the
 * heightfield, x to the right and z downward. Open sea is left transparent.
 */
export function chartImage(size: number): Uint8ClampedArray<ArrayBuffer> {
    const px = new Uint8ClampedArray(size * size * 4);
    for (let j = 0; j < size; j++)
        for (let i = 0; i < size; i++) {
            const h = height(((i + 0.5) / size) * 2 * WORLD - WORLD, ((j + 0.5) / size) * 2 * WORLD - WORLD),
                o = (j * size + i) * 4;
            if (h > 0.2) {
                const k = clamp((h - 1) / 16, 0, 1);
                px[o] = 214 - 120 * k;
                px[o + 1] = 190 - 50 * k;
                px[o + 2] = 132 - 70 * k;
                px[o + 3] = 235;
            } else if (h > -4) {
                px[o] = 90;
                px[o + 1] = 190;
                px[o + 2] = 185;
                px[o + 3] = 90 + 22 * (h + 4);
            }
        }
    return px;
}
