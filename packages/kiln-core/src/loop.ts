/** What the governor steers: `dyn` is the fraction of full resolution to render at, 0..1. */
export interface ResolutionTarget {
    dyn: number;
}

export interface ResolutionGovernor {
    /** Call once per frame with the real frame time in seconds. */
    tick(rdt: number): void;
    /** Drops the cut on trial. Call after setting `dyn` by hand, for instance on a quality change. */
    reset(): void;
}

/**
 * Dynamic resolution: sheds pixels when frames run long and creeps back when there is headroom.
 * `apply` is called after every change to `target.dyn`, to resize the render targets.
 *
 * The frame time to hold is 60 Hz, unless the display itself turns out to be slower. A 30 Hz
 * power-saving cap looks exactly like a struggling GPU, so each cut is checked a moment later:
 * if it bought nothing, the display is the limit, and the pixels are given back.
 */
export function createResolutionGovernor(target: ResolutionTarget, apply: () => void): ResolutionGovernor {
    let avg = 16.7,
        pace = 16.7,
        // smoothed frame time when resolution was last cut, while that cut is on trial
        shedFrom = 0,
        cool = 3;
    return {
        tick(rdt) {
            avg += (rdt * 1000 - avg) * 0.06;
            pace = Math.max(16.7, Math.min(pace, avg));
            cool -= rdt;
            if (shedFrom > 0) {
                if (cool <= 0) {
                    if (avg > shedFrom * 0.94) {
                        pace = avg;
                        target.dyn = Math.min(1, target.dyn + 0.1);
                        apply();
                    }
                    shedFrom = 0;
                    cool = 1.5;
                }
            } else if (avg > pace * 1.29 && cool <= 0 && target.dyn > 0.56) {
                shedFrom = avg;
                target.dyn = Math.max(0.55, target.dyn - 0.1);
                apply();
                cool = 1.5;
            } else if (avg < pace * 1.035 && cool < -12 && target.dyn < 1) {
                target.dyn = Math.min(1, target.dyn + 0.05);
                apply();
                cool = 2;
            }
        },
        reset() {
            shedFrom = 0;
        },
    };
}

/**
 * Frame-rate counter. Call it once per frame with the real frame time in seconds; it returns the
 * average rate every half second and null in between.
 */
export function createFpsMeter(): (rdt: number) => number | null {
    let frames = 0,
        elapsed = 0;
    return (rdt) => {
        frames++;
        if ((elapsed += rdt) <= 0.5) return null;
        const fps = Math.round(frames / elapsed);
        frames = elapsed = 0;
        return fps;
    };
}
