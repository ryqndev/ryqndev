import { m4, m4inv, m4mul, m4persp, m4trs, type Mat4 } from '@ryqndev/kiln-math';

import { FAR, NEAR, R } from './config';

export interface ScreenPoint {
    x: number;
    y: number;
    /** clip-space w: positive when in front of the camera */
    w: number;
}

export const cam = {
    x: 0, y: 10, z: 0, world: m4(), view: m4(), proj: m4(), vp: m4(), sky: m4(),
    rx: 1, ry: 0, rz: 0, ux: 0, uy: 1, uz: 0, fx: 0, fy: 0, fz: -1, fov: 1,
};

// world position -> normalised screen coordinates (0..1, y down). Returns false when behind the camera.
export function project(x: number, y: number, z: number, out: ScreenPoint): boolean {
    const m = cam.vp,
        w = m[3] * x + m[7] * y + m[11] * z + m[15];
    out.x = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / Math.abs(w)) * 0.5 + 0.5;
    out.y = 0.5 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / Math.abs(w)) * 0.5;
    out.w = w;
    return w > 0;
}

// camera matrices from position + orientation
const camW = m4(),
    rot = m4(),
    tmp = m4();
export function setCamera(x: number, y: number, z: number, yaw: number, pitch: number, roll: number, fov: number): Mat4 {
    cam.x = x;
    cam.y = y;
    cam.z = z;
    cam.fov = fov;
    m4trs(camW, x, y, z, yaw, pitch, roll);
    cam.world = camW;
    cam.rx = camW[0];
    cam.ry = camW[1];
    cam.rz = camW[2];
    cam.ux = camW[4];
    cam.uy = camW[5];
    cam.uz = camW[6];
    cam.fx = -camW[8];
    cam.fy = -camW[9];
    cam.fz = -camW[10];
    m4inv(cam.view, camW);
    m4persp(cam.proj, fov, R.w / R.h, NEAR, FAR);
    m4mul(cam.vp, cam.proj, cam.view);
    rot.set(cam.view);
    rot[12] = rot[13] = rot[14] = 0;
    m4mul(tmp, cam.proj, rot);
    m4inv(cam.sky, tmp);
    return camW;
}
