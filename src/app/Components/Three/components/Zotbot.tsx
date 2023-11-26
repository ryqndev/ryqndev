import { Suspense, memo, useCallback, useEffect, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import type { Euler, Vector3 } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Clone, useGLTF, useKeyboardControls } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { RigidBody } from '@react-three/rapier';
import type { CustomControls } from '../controllers/useCustomKeyMapping';

const ZOTBOT_GLTF = '/assets/delivery_robot/zotbot.gltf';

interface ZotbotSpawnState {
    id: string;
    position: Vector3;
    rotation: Euler;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;
const getRandomSpawnState = (): ZotbotSpawnState => ({
    id: uuidv4(),
    position: [random(-60, 60), random(100, 200), random(-60, 60)],
    rotation: [random(0, Math.PI), random(0, Math.PI), random(0, Math.PI)],
});

export const Zotbot = memo(function Zotbot() {
    const { scene } = useLoader(GLTFLoader, ZOTBOT_GLTF);
    const [bots, setBots] = useState(() =>
        new Array(4).fill(0).map(getRandomSpawnState)
    );

    const dropBot = useCallback(() => {
        setBots((prev) => [...prev, getRandomSpawnState()]);
    }, []);

    const [sub] = useKeyboardControls<CustomControls>();

    useEffect(
        () =>
            sub(
                (state) => state,
                ({ SPAWN }) => SPAWN && dropBot()
            ),
        []
    );

    return (
        <Suspense fallback={null}>
            {bots.map(({ id, position, rotation }) => (
                <RigidBody
                    position={position}
                    rotation={rotation}
                    colliders={'cuboid'}
                    key={id}
                >
                    <Clone
                        object={scene}
                        scale={1}
                        rotation={[Math.PI / 2, 0, 0]}
                    />
                </RigidBody>
            ))}
        </Suspense>
    );
});

useGLTF.preload(ZOTBOT_GLTF);
