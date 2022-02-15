import clsx from 'clsx';
import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { CameraControls } from './components';
import cn from './ThreeContainer.module.scss';

function ThreeContainer({ className, children }) {
	return (
		<Suspense fallback={null}>
			<Canvas className={clsx(cn.container, className)}>
				<CameraControls />
				<Physics gravity={[0, -9.8, 0]}>
					{/* <directionalLight intensity={2} position={[1, 1, 1]} color='#ffff00'/>
					<directionalLight intensity={0.5} position={[0, -2, 0]} color='#ff0000'/>
					<ambientLight intensity={0.3} /> */}
					<directionalLight intensity={1} position={[0, 1, 1]} color='#5522dd'/>
					<directionalLight intensity={0.05} position={[0, -2, 0]} color='#888888'/>
					<ambientLight intensity={0.02} />
					{children}
				</Physics>
				{/* <axesHelper /> */}
			</Canvas>
		</Suspense>
	);
}

export default ThreeContainer;
