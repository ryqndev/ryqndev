import {
    Suspense,
    memo,
    useCallback,
    useEffect,
    useState,
} from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Clone, useGLTF, useKeyboardControls } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import type { CustomControls } from '../controllers/useCustomKeyMapping';
import { generateNZotbots, getRandomSpawnState } from 'app/controller/random-gen-utils';

const ZOTBOT_GLTF = '/assets/delivery_robot/zotbot.gltf';

export const Zotbot = memo(function Zotbot() {
    const { scene } = useLoader(GLTFLoader, ZOTBOT_GLTF);
    const [bots, setBots] = useState(() => generateNZotbots(4));

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

    useFrame(() => {
        setBots((prev) =>
            // @ts-ignore
            prev.filter((bot) => bot.ref?.current?.parent?.position?.y > -300)
        );
    });

    return (
        <Suspense fallback={null}>
            {bots.map(({ id, position, rotation, ref }) => (
                <RigidBody
                    position={position}
                    rotation={rotation}
                    restitution={1.5}
                    colliders={'cuboid'}
                    key={id}
                >
                    <Clone
                        object={scene}
                        scale={1}
                        rotation={[Math.PI / 2, 0, 0]}
                        ref={ref}
                    />
                </RigidBody>
            ))}
            <></>
        </Suspense>
    );
});

useGLTF.preload(ZOTBOT_GLTF);
