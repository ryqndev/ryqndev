import { createRef, memo, useEffect, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const { CylinderCollider, RigidBody } = lazily(
    () => import('@react-three/rapier')
);

import type { RapierRigidBody, Vector3Tuple } from '@react-three/rapier';
import { Clone, useGLTF, useKeyboardControls } from '@react-three/drei';
import { CustomControls } from '../../controllers/useCustomKeyMapping';
import { WheelJoint } from './WheelJoint';
import { lazily } from 'react-lazily';

const ZOTBOT_GLTF = '/assets/delivery_robot/zotbot.gltf';

export const DrivableZotbot = memo(function DrivableZotbot() {
    const { scene } = useLoader(GLTFLoader, ZOTBOT_GLTF);
    const zotbotRef = useRef<RapierRigidBody>(null);
    const wheelPositions: Vector3Tuple[] = [
        [-7, 1.5, 4],
        [-7, 1.5, -4],
        [7, 1.5, 4],
        [7, 1.5, -4],
    ];

    const [sub] = useKeyboardControls<CustomControls>();

    const wheelRefs = useRef(
        wheelPositions.map(() => createRef<RapierRigidBody>())
    );

    useEffect(() => {
        return sub(
            (state) => state,
            (pressed) => {
                if (!zotbotRef.current) return;
                zotbotRef.current.addTorque(
                    {
                        x: pressed.LEFT ? 1000 : pressed.RIGHT ? -1000 : 0,
                        y: 0,
                        z: 0,
                    },
                    true
                );
                // if (pressed.RIGHT) zotbotRef.current.configureMotorVelocity(-10, 100);
            }
        );
    }, []);

    return (
        <group position={[0, 40, 0]}>
            <RigidBody colliders={'hull'} restitution={0} ref={zotbotRef}>
                <Clone object={scene} scale={2} />
            </RigidBody>
            {/* {wheelPositions.map((wheelPosition, idx) => (
        <Fragment key={idx}>
          <RigidBody
            position={wheelPosition}
            colliders="hull"
            type="dynamic"
            ref={wheelRefs.current[idx]}
            canSleep={false}
          >
            <CylinderCollider
              args={[0.1, 2]}
              rotation={[Math.PI / 2, 0, Math.PI / 2]}
            />
          </RigidBody>
          <WheelJoint
            body={zotbotRef}
            wheel={wheelRefs.current[idx]}
            bodyAnchor={wheelPosition}
            wheelAnchor={[0, 0, 0]}
            rotationAxis={[1, 0, 0]}
          />
        </Fragment>
      ))} */}
            <group>
                <RigidBody
                    position={wheelPositions[0]}
                    colliders="hull"
                    type="dynamic"
                    ref={wheelRefs.current[0]}
                    canSleep={false}
                >
                    <CylinderCollider
                        args={[0.1, 2]}
                        rotation={[Math.PI / 2, 0, Math.PI / 2]}
                    />
                </RigidBody>
                <WheelJoint
                    body={zotbotRef}
                    wheel={wheelRefs.current[0]}
                    bodyAnchor={wheelPositions[0]}
                    wheelAnchor={[0, 0, 0]}
                    rotationAxis={[1, 0, 0]}
                />
                <RigidBody
                    position={wheelPositions[2]}
                    colliders="hull"
                    type="dynamic"
                    ref={wheelRefs.current[2]}
                    canSleep={false}
                >
                    <CylinderCollider
                        args={[0.1, 2]}
                        rotation={[Math.PI / 2, 0, Math.PI / 2]}
                    />
                </RigidBody>
                <WheelJoint
                    body={zotbotRef}
                    wheel={wheelRefs.current[2]}
                    bodyAnchor={wheelPositions[2]}
                    wheelAnchor={[0, 0, 0]}
                    rotationAxis={[1, 0, 0]}
                />
            </group>

            <RigidBody
                position={wheelPositions[1]}
                colliders="hull"
                type="dynamic"
                ref={wheelRefs.current[1]}
                canSleep={false}
            >
                <CylinderCollider
                    args={[0.1, 2]}
                    rotation={[Math.PI / 2, 0, Math.PI / 2]}
                />
            </RigidBody>
            <WheelJoint
                body={zotbotRef}
                wheel={wheelRefs.current[1]}
                bodyAnchor={wheelPositions[1]}
                wheelAnchor={[0, 0, 0]}
                rotationAxis={[1, 0, 0]}
            />
            <RigidBody
                position={wheelPositions[3]}
                colliders="hull"
                type="dynamic"
                ref={wheelRefs.current[3]}
                canSleep={false}
            >
                <CylinderCollider
                    args={[0.1, 2]}
                    rotation={[Math.PI / 2, 0, Math.PI / 2]}
                />
            </RigidBody>
            <WheelJoint
                body={zotbotRef}
                wheel={wheelRefs.current[3]}
                bodyAnchor={wheelPositions[3]}
                wheelAnchor={[0, 0, 0]}
                rotationAxis={[1, 0, 0]}
            />
        </group>
    );
});

useGLTF.preload(ZOTBOT_GLTF);
