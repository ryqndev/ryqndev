import { Clone, Html } from '@react-three/drei';
import cn from './ProjectZotbot.module.scss';
import { ActionList } from '@components/ActionList/ActionList';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { memo, Suspense, useMemo } from 'react';
import { getRandomSpawnState } from 'app/controller/random-gen-utils';
import { RigidBody } from '@react-three/rapier';
import { random } from 'app/utils/utils';
import { Vector3 } from 'three';

const ZOTBOT_GLTF = '/assets/delivery_robot/zotbot.gltf';

interface ProjectBallProps {
    data: any;
    selected: boolean;
}


export const ProjectZotbot = memo(function ProjectZotbot({ data, selected }: ProjectBallProps) {
    const { scene } = useLoader(GLTFLoader, ZOTBOT_GLTF);
    const { position, rotation, ref } = useMemo(() => getRandomSpawnState(), []);

    const loweredAltitude = useMemo(() => new Vector3(position[0], random(20, 40), position[2]), [position])

    return (
        window.innerWidth > 768 && (
            <Suspense fallback={null}>
                <RigidBody
                    position={loweredAltitude}
                    rotation={rotation}
                    restitution={0}
                    colliders={'cuboid'}
                >
                    <Html className={cn.container}>
                        <ActionList data={data} selected={selected} />
                    </Html>
                    <Clone
                        object={scene}
                        scale={1}
                        rotation={[Math.PI / 2, 0, 0]}
                        ref={ref}
                    />
                </RigidBody>

            </Suspense>
        )
    );
});