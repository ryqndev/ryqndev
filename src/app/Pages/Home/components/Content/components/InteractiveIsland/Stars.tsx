import { Canvas, useLoader } from '@react-three/fiber';
import { memo, useMemo, useState } from 'react';
import { BackSide, TextureLoader } from 'three';
import GALAXY from './components/darker_eso.webp';
import cn from './InteractiveIsland.module.scss';
import { CameraControls } from './components/CameraControls/CameraControls';
import { random } from 'app/utils/utils';
import { CANVAS_DPR } from './constants';

const STAR_COUNT = 150;
const STAR_RADIUS = 1;

const GALAXY_RADIUS = 400;

const Container = memo(function Container({ project }: { project: number }) {
    // Nothing in here moves on its own: render only when the camera does.
    return (
        <Canvas id={cn.stars} dpr={CANVAS_DPR} frameloop="demand">
            <CameraControls project={project} />
            <Stars />
        </Canvas>
    );
});

const Stars = memo(() => {
    const loader = useLoader(TextureLoader, GALAXY);
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

    // Credit goes to "ESO/S. Brunier (http://www.sergebrunier.com/gallerie/pleinciel/index-eng.html)"
    return (
        <mesh rotation={[1.2, 0, 1]}>
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
