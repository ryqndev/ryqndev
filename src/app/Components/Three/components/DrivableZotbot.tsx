import { Suspense, memo, useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { Clone, useGLTF, useKeyboardControls } from "@react-three/drei";
import { CustomControls } from "../controllers/useCustomKeyMapping";

const ZOTBOT_GLTF = "/assets/delivery_robot/zotbot.gltf";

export const DrivableZotbot = memo(function DrivableZotbot() {
  const zotbotRef = useRef<RapierRigidBody>(null);
  const { scene } = useLoader(GLTFLoader, ZOTBOT_GLTF);

  const [sub, get] = useKeyboardControls<CustomControls>();

  console.count("@ryqndev triggered rerender");

  useEffect(() => {
    return sub(
      (state) => state,
      (pressed) => {
        if (!zotbotRef.current) return;

        if (pressed.FORWARD)
          zotbotRef.current.applyImpulse({ x: 0, y: 0, z: 5000 }, true);
        if (pressed.BACKWARD)
          zotbotRef.current.applyImpulse({ x: 0, y: 0, z: -5000 }, true);
        if (pressed.LEFT)
          zotbotRef.current.applyImpulse({ x: -5000, y: 0, z: 0 }, true);
        if (pressed.RIGHT)
          zotbotRef.current.applyImpulse({ x: 5000, y: 0, z: 0 }, true);
        if (pressed.JUMP) {
          zotbotRef.current.applyImpulse({ x: 0, y: 5000, z: 0 }, true);
        }
      }
    );
  }, []);
  return (
    <Suspense>
      <RigidBody colliders={"hull"} restitution={0} ref={zotbotRef}>
        <Clone
          position={[
            Math.random() * 100 - 50,
            Math.random() * 1 + 20,
            Math.random() * 100 - 50,
          ]}
          object={scene}
          rotation={[Math.random(), Math.random(), Math.random()]}
          scale={2}
        />
      </RigidBody>
    </Suspense>
  );
});

useGLTF.preload(ZOTBOT_GLTF);
