export interface Caps {
    /** float render targets are available, so the scene can be rendered in HDR */
    hdr: boolean;
    aniso: EXT_texture_filter_anisotropic | null;
}

// The single WebGL2 context. initGL() assigns it; every renderer module reads this live binding.
export let gl: WebGL2RenderingContext = null!;
export const caps: Caps = { hdr: false, aniso: null };

export function initGL(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
    const ctx = canvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
    });
    if (!ctx) return null;
    gl = ctx;
    caps.hdr = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    caps.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    return gl;
}
