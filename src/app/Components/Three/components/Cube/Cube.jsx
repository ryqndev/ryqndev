import { useRef } from 'react';
import { useBox, useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';

function Cube({ position }) {
	const [ref] = useSphere(() => ({ mass: 1, position: position }));

	// useFrame(() => {
	// 	// mesh.current.rotation.z += 0.001;
	// });
	const hover = () => {
		ref.current.material.color.setHex(0xffffff);
	};
	const unhover = () => {
		ref.current.material.color.setHex(0x00ffff);
	};

	const click = () => {
		ref.current.position.y = position[1];
	};

	return (
		// <mesh
		// 	ref={mesh}

		// 	onClick={click}
		// 	position={[4, 4, 0]}
		// >
		// <boxBufferGeometry args={[2, 4, 2]} />
		// <meshStandardMaterial color={'#00ffff'} wireframe={true} />
		// </mesh>
		// <mesh ref={ref} onClick={click}>
		// 	<sphereBufferGeometry args={[0.02, 24, 24]} />
		// 	<meshStandardMaterial color={'#000000'} />
		// </mesh>
		<mesh
			ref={ref}
			onClick={click}
			onPointerOver={hover}
			onPointerOut={unhover}
		>
			<sphereBufferGeometry args={[0.5, 16, 16]} />
			<meshStandardMaterial color={'#ffff00'} />
		</mesh>
	);
}

export default Cube;
