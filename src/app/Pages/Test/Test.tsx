import { Canvas } from '@react-three/fiber'
import { memo } from 'react';


export const Test = memo(() => {
    return (
        <div>
            Test
            <Canvas>
                <ambientLight intensity={Math.PI / 2} />
                <spotLight angle={0.15} decay={0} intensity={Math.PI} penumbra={1} position={[10, 10, 10]} />
                <pointLight decay={0} intensity={Math.PI} position={[-10, -10, -10]} />
                <mesh position={[2, 0, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color={'orange'} />
                </mesh>
            </Canvas>
        </div>
    );
});

