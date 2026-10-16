import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useEffect, useState, useCallback, memo } from 'react';
import PROJECTS from '@assets/projects.json';

interface CameraControlsProps {
    project: any;
}

export const CameraControls = memo(function CameraControls({
    project,
}: CameraControlsProps) {
    const [cameraVec, setCameraVec] = useState(new Vector3(200, 15, 5));
    const [zoom, setZoom] = useState(() =>
        Math.sqrt(0.005 * window.innerWidth)
    );
    const invalidate = useThree((state) => state.invalidate);

    const resize = useCallback(() => {
        setZoom(Math.sqrt(0.005 * window.innerWidth));
    }, [setZoom]);

    useEffect(() => {
        let angle = (project / PROJECTS.length) * 180;
        setCameraVec(new Vector3(Math.sin(angle) * 400, 80, Math.cos(angle) * 400));
    }, [project]);

    useEffect(() => {
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [resize]);

    // Ease the camera towards its target. On a demand-rendered canvas keep
    // requesting frames until it has arrived; on an always-rendering canvas
    // invalidate() is a no-op.
    useEffect(() => {
        invalidate();
    }, [cameraVec, invalidate]);

    useFrame((state) => {
        if (state.camera.position.distanceToSquared(cameraVec) < 0.01) return;
        state.camera.position.lerp(cameraVec, 0.008);
        invalidate();
    });

    return (
        <>
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                enableRotate={true}
                target={[0, -10, 0]}
            />
            <OrthographicCamera
                makeDefault={true}
                near={-100}
                zoom={zoom}
            />
        </>
    );
});
