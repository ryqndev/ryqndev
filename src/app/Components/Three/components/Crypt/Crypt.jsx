import { Suspense, useEffect } from 'react';
import { Vector3, AnimationMixer } from 'three';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import CryptGLTF from '../../../../assets/tcrypt_location/scene.gltf';

function Crypt() {
	const { scene, animations } = useLoader(
		GLTFLoader,
		'/crypt_location/scene.gltf'
	);
	
	return (
		<Suspense fallback={null}>
			<primitive
				object={scene}
				// anisotropy={1024}
				position={new Vector3(1, -15, -40)}
			/>
		</Suspense>
	);
}

export default Crypt;
