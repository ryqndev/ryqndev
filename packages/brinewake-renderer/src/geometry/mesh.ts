/** A GPU mesh plus the per-frame instance list the renderer draws it with. */
export interface Mesh {
    vao: WebGLVertexArrayObject;
    /** index count */
    count: number;
    /** instances queued this frame */
    cnt: number;
    /** instance data, INSTANCE_STRIDE floats each */
    data: Float32Array;
    /** float offset inside the shared instance buffer for the current frame */
    off: number;
}
