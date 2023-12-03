import {
    Suspense,
    memo,
    useCallback,
    useEffect,
    useState,
    type Ref,
    useRef,
    createRef,
} from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import type { Euler, Vector3 } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Clone, useGLTF, useKeyboardControls } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { RapierRigidBody, RigidBody } from '@react-three/rapier';
import type { CustomControls } from '../controllers/useCustomKeyMapping';

const ZOTBOT_GLTF = '/assets/delivery_robot/zotbot.gltf';

interface ZotbotSpawnState {
    id: string;
    position: Vector3;
    rotation: Euler;
    ref: Ref<any>;
}
const random = (min: number, max: number) => Math.random() * (max - min) + min;

const getRandomSpawnState = (): ZotbotSpawnState => ({
    id: uuidv4(),
    position: [random(-60, 60), random(100, 200), random(-60, 60)],
    rotation: [random(0, Math.PI), random(0, Math.PI), random(0, Math.PI)],
    ref: createRef(),
});

const generateNZotbots = (n: number) =>
    new Array(n).fill(0).map(getRandomSpawnState);

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
            prev.filter((bot) => bot.ref?.current?.parent?.position.y > -300)
        );
    });

    useEffect(() => {
        console.log('@ryqndev', bots.length);
    }, [bots]);

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
