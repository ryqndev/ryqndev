import { gl } from './context';

export interface Program {
    p: WebGLProgram;
    /** uniform locations by name (array uniforms without the `[0]` suffix) */
    u: Record<string, WebGLUniformLocation | null>;
}

const HEADER = '#version 300 es\nprecision highp float;precision highp int;precision highp sampler2DShadow;\n';

export function createProgram(vs: string, fs: string, defs = ''): Program {
    const head = HEADER + defs + '\n';
    const p = gl.createProgram()!;
    const stages: [number, string][] = [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
    ];
    for (const [type, source] of stages) {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, head + source);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + source);
        gl.attachShader(p, sh);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'program link failed');
    const u: Program['u'] = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
        const a = gl.getActiveUniform(p, i)!;
        u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name);
    }
    return { p, u };
}
