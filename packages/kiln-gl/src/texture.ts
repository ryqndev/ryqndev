import { caps, gl } from './context';

export function createTexture(
    w: number,
    h: number,
    ifmt: number,
    fmt: number,
    type: number,
    data: ArrayBufferView | null = null,
    filter: number = gl.LINEAR,
    wrap: number = gl.CLAMP_TO_EDGE,
    mips = false
): WebGLTexture {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (mips) {
        gl.generateMipmap(gl.TEXTURE_2D);
        if (caps.aniso) gl.texParameterf(gl.TEXTURE_2D, caps.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    }
    return t;
}

export function createFramebuffer(color: WebGLTexture | null, depth: WebGLTexture | null): WebGLFramebuffer {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    if (color) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
    else {
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
    }
    if (depth) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
    return f;
}
