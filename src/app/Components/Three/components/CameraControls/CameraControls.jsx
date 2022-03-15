import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useEffect, useMemo, useState, memo } from 'react';
import PROJECTS from '../../../../assets/projects.json';

function CameraControls({ project }) {
	const cameraVec = useMemo(() => new Vector3(200, 15, 5), []);
	const [zoom, setZoom] = useState(() => Math.sqrt(0.005 * window.innerWidth));

	function resize() {
		setZoom(Math.sqrt(0.005 * window.innerWidth));
	}

	useEffect(() => {
		let completion = (project / PROJECTS.length) * 200;
		cameraVec.set(200 - completion, 15, completion);
	}, [project, cameraVec]);

	useEffect(() => {
		resize();
		window.addEventListener('resize', resize);
		return () => window.removeEventListener('resize', resize);
	}, []);

	useFrame(state => {
		state.camera.position.lerp(cameraVec, 0.02);
	});

	return (
		<>
			<OrbitControls
				enableZoom={false}
				enablePan={false}
				enableRotate={false}
				target={[0, -10, 0]}
			/>
			<OrthographicCamera 
				makeDefault 
				position={cameraVec} 
				zoom={zoom} 
			/>
		</>
	);
}

export default memo(CameraControls);
