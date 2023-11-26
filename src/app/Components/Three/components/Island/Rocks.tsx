import { useGLTF } from '@react-three/drei';
import type { GLTFResult } from './types';

export const Rocks = () => {
    const { nodes, materials } = useGLTF(
        '/assets/updated_island/floating island.gltf'
    ) as GLTFResult;
    return (
        <>
            <mesh
                geometry={nodes.rock050.geometry}
                material={materials['Color texture']}
                position={[-1.578, -2.584, 9.213]}
                rotation={[-2.392, 0.346, 0.571]}
                scale={0.781}
            />
            <mesh
                geometry={nodes.rock051.geometry}
                material={materials['Color texture']}
                position={[-4.666, -4.774, 5.102]}
                rotation={[-2.392, 0.346, 0.571]}
                scale={0.781}
            />
            <mesh
                geometry={nodes.rock052.geometry}
                material={materials['Color texture']}
                position={[-2.45, -8.203, 2.55]}
                rotation={[-2.392, 0.346, 0.571]}
                scale={0.781}
            />
            <mesh
                geometry={nodes.rock053.geometry}
                material={materials['Color texture']}
                position={[-6.803, -4.297, -4.655]}
                rotation={[-1.401, 1.325, -0.438]}
                scale={1.204}
            />
            <mesh
                geometry={nodes.rock054.geometry}
                material={materials['Color texture']}
                position={[-4.29, -2.495, -7.514]}
                rotation={[0.099, -0.458, -2.505]}
                scale={1.137}
            />
            <mesh
                geometry={nodes.rock055.geometry}
                material={materials['Color texture']}
                position={[0.295, -2.657, -8.291]}
                rotation={[0.959, -0.084, 2.88]}
                scale={1.122}
            />
            <mesh
                geometry={nodes.rock056.geometry}
                material={materials['Color texture']}
                position={[6.349, -6.133, -4.992]}
                rotation={[0.299, -0.714, 2.221]}
                scale={1.204}
            />
            <mesh
                geometry={nodes.rock057.geometry}
                material={materials['Color texture']}
                position={[10.076, -3.249, -2.775]}
                rotation={[0.299, -0.714, 2.221]}
                scale={1.388}
            />
            <mesh
                geometry={nodes.rock058.geometry}
                material={materials['Color texture']}
                position={[1.506, -8.34, 3.851]}
                rotation={[-1.486, 0.511, 2.93]}
                scale={1.626}
            />
            <mesh
                geometry={nodes.rock059.geometry}
                material={materials['Color texture']}
                position={[4.221, -12.56, -1.974]}
                rotation={[-1.486, 0.511, 2.93]}
                scale={1.626}
            />
            <mesh
                geometry={nodes.rock060.geometry}
                material={materials['Color texture']}
                position={[-0.426, -7.554, -5.146]}
                rotation={[0.099, -0.458, -2.505]}
                scale={0.73}
            />
            <mesh
                geometry={nodes.rock061.geometry}
                material={materials['Color texture']}
                position={[-8.836, -2.856, 0.48]}
                rotation={[-2.392, 0.346, 0.571]}
                scale={0.781}
            />
            <mesh
                geometry={nodes.rock048.geometry}
                material={materials['Color texture']}
                position={[4.331, -2.459, 7.918]}
                rotation={[1.992, -0.077, 0.022]}
                scale={1.217}
            />
            <mesh
                geometry={nodes.rock049.geometry}
                material={materials['Color texture']}
                position={[6.846, -5.821, 4.703]}
                rotation={[-2.392, 0.346, 0.571]}
                scale={1.217}
            />
            <mesh
                geometry={nodes.rock046.geometry}
                material={materials['Color texture']}
                position={[-4.012, 0.715, 0.769]}
                rotation={[1.58, 0.044, -0.014]}
                scale={1.795}
            />
            <mesh
                geometry={nodes.rock047.geometry}
                material={materials['Color texture']}
                position={[-2.098, 0.55, 5.203]}
                rotation={[-0.328, 0.657, -1.44]}
                scale={[0.187, 0.386, 0.343]}
            />
            <mesh
                geometry={nodes.rock062.geometry}
                material={materials['Color texture']}
                position={[-2.378, 0.546, -4.534]}
                rotation={[-1.427, 0.046, 0.878]}
                scale={[0.906, 0.91, 1.31]}
            />
            <mesh
                geometry={nodes.rock063.geometry}
                material={materials['Color texture']}
                position={[1.933, 0.6, -0.748]}
                rotation={[-1.427, 0.046, 0.878]}
                scale={1.04}
            />
            <mesh
                geometry={nodes.rock064.geometry}
                material={materials['Color texture']}
                position={[-0.891, -7.141, -8.059]}
                rotation={[1.144, -0.028, -2.889]}
                scale={[0.76, 0.953, 1.51]}
            />
            <mesh
                geometry={nodes.rock065.geometry}
                material={materials['Color texture']}
                position={[-4.131, -10.503, -5.576]}
                rotation={[-0.834, -0.525, -2.769]}
                scale={0.751}
            />
            <mesh
                geometry={nodes.rock066.geometry}
                material={materials['Color texture']}
                position={[5.153, -7.266, -7.833]}
                rotation={[-0.834, -0.525, -2.769]}
                scale={0.482}
            />
            <mesh
                geometry={nodes.rock067.geometry}
                material={materials['Color texture']}
                position={[7.114, -9.456, -3.079]}
                rotation={[-0.834, -0.525, -2.769]}
                scale={0.482}
            />
            <mesh
                geometry={nodes.rock068.geometry}
                material={materials['Color texture']}
                position={[4.33, -12.885, -1.163]}
                rotation={[-0.834, -0.525, -2.769]}
                scale={0.482}
            />
            <mesh
                geometry={nodes.rock069.geometry}
                material={materials['Color texture']}
                position={[6.74, -8.979, 6.902]}
                rotation={[-2.438, -1.191, 1.974]}
                scale={[0.763, 0.846, 1.33]}
            />
            <mesh
                geometry={nodes.rock070.geometry}
                material={materials['Color texture']}
                position={[-6.078, -6.703, 3.935]}
                rotation={[2.747, 0.953, -0.793]}
                scale={0.918}
            />
            <mesh
                geometry={nodes.rock071.geometry}
                material={materials['Color texture']}
                position={[0.825, -13.776, -3.413]}
                rotation={[-1.791, -0.472, -0.495]}
                scale={[0.999, 0.793, 1.331]}
            />
            <mesh
                geometry={nodes.rock072.geometry}
                material={materials['Color texture']}
                position={[-3.261, -17.242, 1.546]}
                rotation={[-1.791, -0.472, -0.495]}
                scale={[1.33, 1.004, 1.835]}
            />
            <mesh
                geometry={nodes.rock073.geometry}
                material={materials['Color texture']}
                position={[0.443, -12.236, 5.781]}
                rotation={[3.024, 0.71, 0.669]}
                scale={0.451}
            />
            <mesh
                geometry={nodes.rock075.geometry}
                material={materials['Color texture']}
                position={[9.994, -7.538, 2.439]}
                rotation={[-0.834, -0.525, -2.769]}
                scale={[1.122, 1.046, 2.384]}
            />
            <mesh
                geometry={nodes.rock076.geometry}
                material={materials['Color texture']}
                position={[-4.399, -15.197, -3.076]}
                rotation={[-1.819, 1.321, -0.008]}
                scale={[0.507, 0.563, 0.884]}
            />
            <mesh
                geometry={nodes.rock077.geometry}
                material={materials['Color texture']}
                position={[8.646, -17.033, -4.788]}
                rotation={[0.276, -0.614, 2.183]}
                scale={1.163}
            />
            <mesh
                geometry={nodes.rock078.geometry}
                material={materials['Color texture']}
                position={[4.227, -22.988, -2.384]}
                rotation={[-1.545, 0.517, 3.05]}
                scale={[1.196, 0.903, 1.649]}
            />
            <mesh
                geometry={nodes.rock079.geometry}
                material={materials['Color texture']}
                position={[-5.883, -11.016, 2.244]}
                rotation={[-2.414, 0.269, 0.645]}
                scale={[0.423, 0.394, 0.898]}
            />
        </>
    );
};
