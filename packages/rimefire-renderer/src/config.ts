/** Floats per instance: 3x4 model matrix rows, tint rgb + flash, emissive / dissolve / 2 spare. */
export const INSTANCE_STRIDE = 20;
/** Floats per particle and the most the renderer will draw in one frame. */
export const PARTICLE_STRIDE = 16;
export const PARTICLE_CAPACITY = 4900;
/** Floats per gel blob and the most the renderer will draw in one frame. */
export const GOO_STRIDE = 12;
export const GOO_CAPACITY = 1000;

export interface RenderSettings {
    /** internal render size */
    w: number;
    h: number;
    /** canvas backing-store size */
    cw: number;
    ch: number;
    /** 0 low .. 3 ultra: caps the internal pixel budget */
    quality: number;
    /** dynamic resolution factor, lowered when frames run long */
    dyn: number;
    ao: boolean;
    canvas: HTMLCanvasElement | null;
}

export const R: RenderSettings = { w: 0, h: 0, cw: 0, ch: 0, quality: 2, dyn: 1, ao: true, canvas: null };
export const SUN = [0.42, 0.5, 0.757];
export const SUNCOL = [0.5, 0.68, 1.05],
    FOG = [0.04, 0.062, 0.09, 0.0105];
export const SM = 2048,
    SHR = 50,
    NEAR = 0.1,
    FAR = 700;

export const post = { exposure: 1.15, bloom: 0.055, vig: 0.85, dmg: 0, ca: 0, desat: 0, flash: 0 };
