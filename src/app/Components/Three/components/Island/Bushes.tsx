import { useGLTF } from "@react-three/drei";
import { GLTFResult } from "./types";

export const Bushes = () => {
  const { nodes, materials } = useGLTF(
    "/assets/updated_island/floating island.gltf"
  ) as GLTFResult;

  return (
    <>
      <mesh
        geometry={nodes.bush011.geometry}
        material={materials["Color texture"]}
        position={[-3.772, 0.669, -3.445]}
        rotation={[2.997, -0.203, -2.995]}
        scale={0.685}
      />
      <mesh
        geometry={nodes.bush012.geometry}
        material={materials["Color texture"]}
        position={[-4.547, 0.718, -3.854]}
        rotation={[0.152, 0.368, 0.121]}
        scale={0.938}
      />
      <mesh
        geometry={nodes.bush013.geometry}
        material={materials["Color texture"]}
        position={[8.54, 0.67, 2.352]}
        rotation={[2.872, -1.01, 3.088]}
        scale={0.775}
      />
      <mesh
        geometry={nodes.bush014.geometry}
        material={materials["Color texture"]}
        position={[8.2, 0.651, 2.785]}
        rotation={[0.143, 0.117, 0.159]}
        scale={0.662}
      />
      <mesh
        geometry={nodes.bush015.geometry}
        material={materials["Color texture"]}
        position={[9.008, 0.621, 1.484]}
        rotation={[2.945, -0.761, -3.102]}
        scale={[0.523, 0.631, 0.521]}
      />
      <mesh
        geometry={nodes.bench001.geometry}
        material={materials["Color texture"]}
        position={[6.578, 1.156, 5.167]}
        rotation={[0, 0.708, 0]}
        scale={1.523}
      />
      <mesh
        geometry={nodes.bush016.geometry}
        material={materials["Color texture"]}
        position={[0.396, 0.563, -4.303]}
        rotation={[2.991, 0.35, -2.914]}
        scale={0.904}
      />
      <mesh
        geometry={nodes.bush017.geometry}
        material={materials["Color texture"]}
        position={[-0.175, 0.541, -4.597]}
        rotation={[0.44, -1.232, 0.593]}
        scale={0.772}
      />
      <mesh
        geometry={nodes.bush018.geometry}
        material={materials["Color texture"]}
        position={[1.159, 0.505, -2.869]}
        rotation={[2.969, 0.603, -2.867]}
        scale={[0.609, 0.736, 0.608]}
      />

      <mesh
        geometry={nodes.bush019.geometry}
        material={materials["Color texture"]}
        position={[2.623, 0.59, 6.471]}
        rotation={[2.932, -0.826, -3.121]}
        scale={[0.659, 0.65, 0.658]}
      />
      <mesh
        geometry={nodes.bush020.geometry}
        material={materials["Color texture"]}
        position={[3.393, 0.564, 4.864]}
        rotation={[0.673, 1.342, -0.484]}
        scale={[0.659, 0.65, 0.658]}
      />
    </>
  );
};
