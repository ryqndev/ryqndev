import { Suspense, useEffect, useRef } from 'react';
import { usePlane } from '@react-three/cannon';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function UCI({ y }) {
	const primitive = useRef();
	const { scene } = useLoader(GLTFLoader, '/assets/island/island.gltf');
	const [ref] = usePlane(() => ({
		rotation: [-Math.PI / 2, 0, 0],
		position: [0, 0.2, 0],
	}));

	useEffect(() => {
		primitive.current.rotation.y = y / window.innerHeight / 2;
	}, [y]);

	return (
		<Suspense fallback={null}>
			<primitive
				ref={primitive}
				object={scene}
				rotation={[0, 0, 0]}
				scale={10}
			/>
		</Suspense>
	);
}

export default UCI;
