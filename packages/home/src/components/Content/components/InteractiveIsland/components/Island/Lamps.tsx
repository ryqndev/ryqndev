import { useGLTF } from '@react-three/drei';
import type { GLTFResult } from './types';

export const Lamps = () => {
    const { nodes, materials } = useGLTF(
        '/assets/updated_island/floating island.gltf'
    ) as GLTFResult;
    return (
        <>
            <group position={[1.246, 0.516, 7.424]} scale={2.439}>
                <mesh
                    geometry={nodes.Cylinder001.geometry}
                    material={materials['Color texture']}
                />
                <mesh
                    geometry={nodes.Cylinder001_1.geometry}
                    material={materials.light}
                />
            </group>
            <group position={[4.059, 0.495, 2.108]} scale={2.439}>
                <mesh
                    geometry={nodes.Cylinder001.geometry}
                    material={materials['Color texture']}
                />
                <mesh
                    geometry={nodes.Cylinder001_1.geometry}
                    material={materials.light}
                />
            </group>
            <group position={[4.02, 0.51, -5.378]} scale={2.439}>
                <mesh
                    geometry={nodes.Cylinder001.geometry}
                    material={materials['Color texture']}
                />
                <mesh
                    geometry={nodes.Cylinder001_1.geometry}
                    material={materials.light}
                />
            </group>
        </>
    );
};
