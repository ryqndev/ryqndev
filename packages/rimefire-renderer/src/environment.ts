import { caps, gl } from '@ryqndev/kiln-gl';
import { m4, m4inv, m4mul, m4persp, type Mat4 } from '@ryqndev/kiln-math';


const SIZE = 128;

// [forward, up] per cube face, in the order WebGL numbers them (+X, -X, +Y, -Y, +Z, -Z)
const FACES = [
    [1, 0, 0, 0, -1, 0],
    [-1, 0, 0, 0, -1, 0],
    [0, 1, 0, 0, 0, 1],
    [0, -1, 0, 0, 0, -1],
    [0, 0, 1, 0, -1, 0],
    [0, 0, -1, 0, -1, 0],
];

let cube!: WebGLTexture, fbo!: WebGLFramebuffer;
// clip space -> view direction, one per face
const unproject: Mat4[] = [];
let next = 0,
    primed = false;

/**
 * The environment map: the live sky rendered into a small cube with a mip chain, so glossy
 * surfaces reflect it and everything is lit by its actual colour.
 */
export function initEnvironment(): WebGLTexture {
    cube = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube);
    for (let i = 0; i < 6; i++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, caps.hdr ? gl.RGBA16F : gl.RGBA8, SIZE, SIZE, 0, gl.RGBA, caps.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    fbo = gl.createFramebuffer();

    const proj = m4persp(m4(), Math.PI / 2, 1, 0.1, 10),
        view = m4(),
        vp = m4();
    for (const [fx, fy, fz, ux, uy, uz] of FACES) {
        // right = forward x up, true up = right x forward
        const sx = fy * uz - fz * uy,
            sy = fz * ux - fx * uz,
            sz = fx * uy - fy * ux;
        const tx = sy * fz - sz * fy,
            ty = sz * fx - sx * fz,
            tz = sx * fy - sy * fx;
        view.set([sx, tx, -fx, 0, sy, ty, -fy, 0, sz, tz, -fz, 0, 0, 0, 0, 1]);
        unproject.push(m4inv(m4(), m4mul(vp, proj, view)));
    }
    return cube;
}

/**
 * Refreshes the map. The sky drifts slowly, so one face per frame is plenty; the first call fills
 * all six. `drawSky` must render the sky for the given clip-to-direction matrix into the bound target.
 */
export function updateEnvironment(drawSky: (unproject: Mat4) => void) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, SIZE, SIZE);
    for (let n = primed ? 1 : 6; n > 0; n--) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + next, cube, 0);
        drawSky(unproject[next]);
        next = (next + 1) % 6;
        if (next === 0) {
            // a full pass is done: rebuild the blur chain
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        }
    }
    primed = true;
}
