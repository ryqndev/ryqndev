import {
	PerspectiveCamera,
	OrbitControls,
	OrthographicCamera,
} from '@react-three/drei';

function CameraControls() {
	return (
		<>
			<OrbitControls autoRotate autoRotateSpeed={1} enableZoom={false} target={[0, 2, 0]}/>
			<OrthographicCamera makeDefault zoom={50} position={[10, 2.8, 0]} />
		</>
	);
}

export default CameraControls;
