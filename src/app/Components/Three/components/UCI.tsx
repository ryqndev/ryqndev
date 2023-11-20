import { Suspense, memo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RigidBody } from "@react-three/rapier";
import { Island } from "./Island/Island";

export function UCI() {
  return (
    <Island
      receiveShadow
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={10}
    />
  );
}
