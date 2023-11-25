import { Suspense, memo, useEffect, useRef, useState } from "react";
import { Euler, Vector3, useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RigidBody } from "@react-three/rapier";
import { Clone, useGLTF } from "@react-three/drei";
import { v4 as uuidv4 } from "uuid";

const ZOTBOT_GLTF = "/assets/delivery_robot/zotbot.gltf";

interface ZotbotSpawnState {
  id: string;
  position: Vector3;
  rotation: Euler;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;
const getRandomSpawnState = (): ZotbotSpawnState => ({
  id: uuidv4(),
  position: [random(-60, 60), random(20, 80), random(-60, 60)],
  rotation: [random(0, Math.PI), random(0, Math.PI), random(0, Math.PI)],
});

export const Zotbot = memo(function Zotbot() {
  const { scene } = useLoader(GLTFLoader, ZOTBOT_GLTF);
  const [bots, setBots] = useState(() =>
    new Array(4).fill(0).map(getRandomSpawnState)
  );

  return (
    <Suspense fallback={null}>
      {bots.map(({ id, position, rotation }) => (
        <RigidBody
          position={position}
          rotation={rotation}
          colliders={"cuboid"}
          key={id}
        >
          <Clone object={scene} scale={1} rotation={[Math.PI / 2, 0, 0]} />
        </RigidBody>
      ))}
    </Suspense>
  );
});

useGLTF.preload(ZOTBOT_GLTF);
