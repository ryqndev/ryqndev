import * as THREE from "three";
import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTFResult } from "./types";
import { Rocks } from "./Rocks";
import { Lamps } from "./Lamps";
import { Bushes } from "./Bushes";
import { RigidBody } from "@react-three/rapier";

export function Island(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/assets/updated_island/floating island.gltf"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <RigidBody colliders="trimesh" type="fixed">
        <Lamps />
        <Bushes />
        <mesh
          geometry={nodes.base001.geometry}
          material={materials["Color texture"]}
          position={[-1.63, -8.489, 0.72]}
          scale={[12.702, 12.702, 12.975]}
        />
        <mesh
          geometry={nodes.grass001.geometry}
          material={materials["Color texture"]}
          position={[1.398, -0.544, 0.4]}
        />
        <mesh
          geometry={nodes.path004.geometry}
          material={materials["Color texture"]}
          position={[0.148, 0.733, 8.952]}
          scale={0.581}
        />

        <mesh
          geometry={nodes.tree005.geometry}
          material={materials["Color texture"]}
          position={[6.629, 0.555, 1.699]}
          rotation={[0, 0.05, 0]}
          scale={2.091}
        />
        <mesh
          geometry={nodes.tree006.geometry}
          material={materials["Color texture"]}
          position={[8.045, 0.555, -3.387]}
          rotation={[0, 0.37, 0]}
          scale={2.049}
        />

        <mesh
          geometry={nodes.path005.geometry}
          material={materials["Color texture"]}
          position={[-3.769, 0.561, 3.787]}
          rotation={[-0.08, -0.942, -1.658]}
          scale={[0.068, 0.255, 0.256]}
        />

        <mesh
          geometry={nodes.path006.geometry}
          material={materials["Color texture"]}
          position={[0.219, 0.553, -2.476]}
          rotation={[-3.091, -0.353, 1.566]}
          scale={[0.078, 0.295, 0.296]}
        />

        <Rocks />
      </RigidBody>
      <group
        position={[-5.305, 0.566, 3.731]}
        rotation={[0.088, 0.134, 0.19]}
        scale={[0.692, 0.503, 0.692]}
      >
        <mesh
          geometry={nodes.Mesh004.geometry}
          material={materials["Color texture"]}
        />
        <RigidBody colliders="trimesh" type="fixed">
          <mesh
            geometry={nodes.Mesh004_1.geometry}
            material={materials.trunk}
          />
        </RigidBody>
      </group>
      <group
        position={[-6.46, 0.597, -0.471]}
        rotation={[3.052, -0.228, -2.96]}
        scale={[0.809, 0.588, 0.809]}
      >
        <mesh
          geometry={nodes.Mesh005.geometry}
          material={materials["Color texture"]}
        />
        <RigidBody colliders="trimesh" type="fixed">
          <mesh
            geometry={nodes.Mesh005_1.geometry}
            material={materials.trunk}
          />
        </RigidBody>
      </group>
      <group
        position={[-3.107, 0.619, -1.11]}
        rotation={[3.032, 0.656, -2.873]}
        scale={[0.75, 0.546, 0.75]}
      >
        <mesh
          geometry={nodes.Mesh006.geometry}
          material={materials["Color texture"]}
        />
        <RigidBody colliders="trimesh" type="fixed">
          <mesh
            geometry={nodes.Mesh006_1.geometry}
            material={materials.trunk}
          />
        </RigidBody>
      </group>
      <mesh
        geometry={nodes.Plane023.geometry}
        material={materials["Color texture"]}
        position={[2.128, 0.465, 8.753]}
        rotation={[1.965, -0.16, 0.592]}
        scale={1.288}
      />
    </group>
  );
}

useGLTF.preload("/assets/updated_island/floating island.gltf");
