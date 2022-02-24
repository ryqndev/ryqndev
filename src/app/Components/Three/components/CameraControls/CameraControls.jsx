import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useEffect, useMemo, useState, memo } from 'react';
import PROJECTS from '../../../../assets/projects.json';

function CameraControls({ project }) {
	const cameraVec = useMemo(() => new Vector3(20, 2, 0), []);
	const [zoom, setZoom] = useState(45);

	function resize() {
		setZoom(Math.sqrt(1.5 * window.innerWidth - 300));
	}

	useEffect(() => {
		let completion = (project / PROJECTS.length) * 20;
		cameraVec.set(20 - completion, 2, completion);
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
				// enable={false}
				enableZoom={false}
				enablePan={false}
				enableRotate={false}
				target={[0, 0, 0]}
			/>
			<OrthographicCamera makeDefault zoom={zoom} />
		</>
	);
}

export default memo(CameraControls);
