import {
    Suspense,
    memo,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useFrame } from '@react-three/fiber';
import { Clone, useGLTF, useKeyboardControls } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import type { CustomControls } from '../controllers/useCustomKeyMapping';
import {
    generateNZotbots,
    getRandomSpawnState,
    type ZotbotSpawnState,
} from 'app/controller/random-gen-utils';

const ZOTBOT_GLTF = '/assets/delivery_robot/zotbot.gltf';

export const Zotbot = memo(function Zotbot() {
    const { scene } = useGLTF(ZOTBOT_GLTF);
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

    // Drop bots that have fallen off the island. Only touch state when one
    // actually has: `filter` returns a new array even when nothing changed,
    // which re-rendered this whole subtree on every frame.
    const botsRef = useRef(bots);
    botsRef.current = bots;

    useFrame(() => {
        const onIsland = (bot: ZotbotSpawnState) =>
            // @ts-ignore
            bot.ref?.current?.parent?.position?.y > -300;
        if (botsRef.current.every(onIsland)) return;
        setBots((prev) => prev.filter(onIsland));
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
