import { OrbitControls, OrthographicCamera } from '@react-three/drei';

function CameraControls() {
	return (
		<>
			<OrbitControls
				enable={false}
				enableZoom={false}
				enablePan={false}
				enableRotate={false}
				target={[0, 1, 0]}
			/>
			<OrthographicCamera makeDefault zoom={45} position={[10, 2, 0]} />
		</>
	);
}

export default CameraControls;
