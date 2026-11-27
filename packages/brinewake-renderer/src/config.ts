/** Floats per instance: 3x4 model matrix rows, then tint rgb + hit flash. */
export const INSTANCE_STRIDE = 16;
/** The most particles the renderer will draw in one frame; kiln-gl's PARTICLE_STRIDE floats each. */
export const PARTICLE_CAPACITY = 4096;
/** Floats per foam stamp (x, z, radius, strength) and the most accepted in one frame. */
export const FOAM_STRIDE = 4;
export const FOAM_CAPACITY = 256;
export const MAX_LIGHTS = 8;
/** Half-size in metres of the square the terrain and foam maps cover; the playable sea sits inside it. */
export const WORLD = 720;

export interface RenderSettings {
    /** internal render size */
    w: number;
    h: number;
    /** canvas backing-store size */
    cw: number;
    ch: number;
    /** 0 low .. 3 ultra: caps the internal pixel budget and the shadow map size */
    quality: number;
    /** dynamic resolution factor, lowered when frames run long */
    dyn: number;
    canvas: HTMLCanvasElement | null;
}

export const R: RenderSettings = { w: 0, h: 0, cw: 0, ch: 0, quality: 2, dyn: 1, canvas: null };
export const NEAR = 0.5,
    FAR = 4200;
/** Half-width in metres of the area around the focus point that receives the sun's shadows. */
export const SHADOW_RANGE = 150;

/**
 * The hull the sea is not drawn inside: a ship someone can go below in has decks under the
 * waterline, and the sea's surface would otherwise lie across them. `m` takes a point of the world
 * into her own frame (bow at -z, waterline at y = 0, her own metres); she is hollow from `z0` to
 * `z1` of it, and `half`, `len` and `draft` are half her beam, her length and her draught, from
 * which the shader knows the shape of her side (the same lines models.ts lofts her to).
 */
export const dry = { on: false, m: new Float32Array(16), z0: 0, z1: 0, half: 0, len: 1, draft: 0 };

export const post = { exposure: 1, bloom: 0.045, vig: 0.55, dmg: 0, flash: 0, desat: 0 };
