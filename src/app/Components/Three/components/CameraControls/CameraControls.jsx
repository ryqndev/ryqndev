import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useEffect, useState } from 'react';

function CameraControls() {
	const [zoom, setZoom] = useState(45);

	function resize() {
		if (window.innerWidth > 1200) {
			setZoom(45);
		} else if (window.innerWidth > 950) {
			setZoom(38);
		} else if (window.innerWidth > 700) {
			setZoom(30);
		} else if (window.innerWidth > 550) {
			setZoom(25);
		} else if (window.innerWidth > 440) {
			setZoom(20);
		} else {
			setZoom(15);
		}
	}

	useEffect(() => {
		resize();
		window.addEventListener('resize', resize);
		return () => window.removeEventListener('resize', resize);
	}, []);

	return (
		<>
			<OrbitControls
				enable={false}
				enableZoom={false}
				enablePan={false}
				enableRotate={false}
				target={[0, 1, 0]}
			/>
			<OrthographicCamera makeDefault zoom={zoom} position={[10, 2, 0]} />
		</>
	);
}

export default CameraControls;
