import { Suspense } from 'react';
import { useBox, usePlane } from '@react-three/cannon';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function UCI() {
	const [ref] = usePlane(() => ({
		rotation: [-Math.PI / 2, 0, 0],
		position: [0, -0.5, 0],
		// size: [10, 10, 10],
	}));
	const { scene } = useLoader(
		GLTFLoader,
		'/assets/island/island.gltf'
	);
	return (
		<Suspense fallback={null}>
			<primitive object={scene} rotation={[0, 0, 0]} scale={10}/>
		</Suspense>
	);
}

export default UCI;
