/** A GPU mesh plus the per-frame instance lists the renderer draws it with. */
export interface Mesh {
    vao: WebGLVertexArrayObject;
    /** index count */
    count: number;
    /** instance count per layer (0 = world, 1 = first-person viewmodel) */
    cnt: [number, number];
    /** instance data per layer, INSTANCE_STRIDE floats each */
    data: [Float32Array, Float32Array];
    /** float offset of each layer inside the shared instance buffer for the current frame */
    off: [number, number];
}
