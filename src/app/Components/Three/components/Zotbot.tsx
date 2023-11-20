import { Suspense, memo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RigidBody } from "@react-three/rapier";
import { Clone, useGLTF } from "@react-three/drei";

const ZOTBOT_GLTF = "/assets/delivery_robot/zotbot.gltf";

export const Zotbot = memo(function Zotbot() {
  const { scene } = useLoader(GLTFLoader, ZOTBOT_GLTF);

  return (
    <Suspense fallback={null}>
      {new Array(5).fill(0).map((e, i) => (
        <RigidBody colliders={"hull"} restitution={0} key={i}>
          <Clone
            receiveShadow
            position={[
              Math.random() * 100 - 50,
              Math.random() * 1 + 20,
              Math.random() * 100 - 50,
            ]}
            object={scene}
            rotation={[Math.random(), Math.random(), Math.random()]}
            scale={1}
          />
        </RigidBody>
      ))}
    </Suspense>
  );
});

useGLTF.preload(ZOTBOT_GLTF);
