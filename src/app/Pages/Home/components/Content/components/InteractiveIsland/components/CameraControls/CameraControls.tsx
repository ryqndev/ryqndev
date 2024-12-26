import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
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

    useFrame((state) => {
        state.camera.position.lerp(cameraVec, 0.008);
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
