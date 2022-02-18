import clsx from 'clsx';
import { Suspense, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { CameraControls } from './components';
import cn from './ThreeContainer.module.scss';

function ThreeContainer({ className, children, theme, y }) {
	return (
		<Suspense fallback={null}>
			<Canvas className={clsx(cn.container, className)}>
				<CameraControls y={y}/>
				<Physics gravity={[0, -9.8, 0]}>
					<directionalLight
						intensity={0.8}
						position={[0, 1, 1]}
						color={theme ? '#6633dd' : '#ffff00'}
					/>
					<directionalLight
						intensity={0.05}
						position={[0, -2, 0]}
						color={theme ? '#888888' : '#ffff00'}
					/>
					<ambientLight intensity={theme ? 0.02 : 0.4} />
					{children}
				</Physics>
			</Canvas>
		</Suspense>
	);
}

export default memo(ThreeContainer);
