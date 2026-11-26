import { gl } from './context';

type Uniforms = Record<string, WebGLUniformLocation | null>;

export interface Program {
    p: WebGLProgram;
    /** uniform locations by name (array uniforms without the `[0]` suffix) */
    u: Uniforms;
}

const HEADER = '#version 300 es\nprecision highp float;precision highp int;precision highp sampler2DShadow;precision highp sampler2DArray;\n';

/**
 * Compiles and links a program. The work is only handed to the driver here; nothing waits for it
 * until the program's uniforms are first read. Programs created back to back therefore compile
 * side by side instead of one after another, which is most of the renderer's start-up time.
 * Compile and link errors surface at that first read.
 */
export function createProgram(vs: string, fs: string, defs = ''): Program {
    const head = HEADER + defs + '\n';
    const p = gl.createProgram()!;
    const stages = [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
    ].map(([type, source]) => {
        const shader = gl.createShader(type as number)!;
        gl.shaderSource(shader, head + source);
        gl.compileShader(shader);
        gl.attachShader(p, shader);
        return { shader, source: source as string };
    });
    gl.linkProgram(p);

    let uniforms: Uniforms | null = null;
    const resolve = () => {
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            for (const { shader, source } of stages) {
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) + '\n' + source);
            }
            throw new Error(gl.getProgramInfoLog(p) ?? 'program link failed');
        }
        const u: Uniforms = {};
        const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
        for (let i = 0; i < n; i++) {
            const a = gl.getActiveUniform(p, i)!;
            u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name);
        }
        return u;
    };
    return {
        p,
        get u() {
            return (uniforms ??= resolve());
        },
    };
}
