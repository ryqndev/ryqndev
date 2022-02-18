import {
	OrbitControls,
	OrthographicCamera,
} from '@react-three/drei';

function CameraControls() {
	return (
		<>
			<OrbitControls enableZoom={false} target={[0, 2, 0]}/>
			<OrthographicCamera makeDefault zoom={45} position={[10, 2.8, 0]} />
		</>
	);
}

export default CameraControls;
