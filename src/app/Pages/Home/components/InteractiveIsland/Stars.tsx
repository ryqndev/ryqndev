import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { memo, useMemo, useRef, useState } from 'react';
import { BackSide, Mesh, TextureLoader, Vector3 } from 'three';
import GALAXY from './components/darker_eso.jpg';
import cn from './InteractiveIsland.module.scss';
import { CameraControls } from './components/CameraControls/CameraControls';
import { random } from 'app/utils/utils';

const STAR_COUNT = 150;
const STAR_RADIUS = 1;

const GALAXY_RADIUS = 400;

const Container = memo(function Container({ project }: { project: any }) {
    return (
        <Canvas id={cn.stars}>
            <CameraControls project={project} />
            <Stars />
        </Canvas>
    );
});

const Stars = memo(() => {
    const loader = useLoader(TextureLoader, GALAXY);
    const galaxyRef = useRef<Mesh>(null);
    const [stars] = useState<[x: number, y: number, z: number][]>(() =>
        new Array(STAR_COUNT)
            .fill(undefined)
            .map(
                (_) =>
                    [
                        random(-GALAXY_RADIUS, GALAXY_RADIUS),
                        random(-GALAXY_RADIUS, GALAXY_RADIUS),
                        random(-GALAXY_RADIUS, GALAXY_RADIUS)
                    ]
            )
    );

    const starMesh = useMemo(() => <meshBasicMaterial color="#00ffff" />, []);
    const starGeometry = useMemo(
        () => <sphereGeometry args={[STAR_RADIUS, 4, 4]} />,
        []
    );

    useFrame(() => {
        if (!galaxyRef.current) return;
        galaxyRef.current.rotation.y += 0.0001;
    });


    // Credit goes to "ESO/S. Brunier (http://www.sergebrunier.com/gallerie/pleinciel/index-eng.html)"
    return (
        <mesh rotation={[1.2, 0, 1]} ref={galaxyRef}>
            <sphereGeometry args={[GALAXY_RADIUS, 40, 40]} />
            <meshBasicMaterial side={BackSide} map={loader} />
            {stars.map((e, idx) => (
                <mesh key={idx} position={e}>
                    {starGeometry}
                    {starMesh}
                </mesh>
            ))}
        </mesh>
    );
});

export { Container as Stars };
