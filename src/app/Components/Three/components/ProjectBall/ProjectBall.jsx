import { memo, useEffect } from 'react';
import { useBox } from '@react-three/cannon';
import ActionList from '../../../ActionList';
import { Html } from '@react-three/drei';
import cn from './ProjectBall.module.scss';

function ProjectBall({ data, selected }) {
	const [ref] = useBox(() => ({
		mass: 1,
		position: [
			Math.random() * 10 - 5,
			Math.random() * 5 + 10,
			Math.random() * 10 - 5,
		],
	}));

	useEffect(() => {
		if (selected) ref.current.material.color.setHex(0xffffff);
		else ref.current.material.color.setHex(0x00ffff);
	}, [selected, ref]);

	const hover = () => {
		ref.current.material.color.setHex(0x000000);
	};
	const unhover = () => {
		ref.current.material.color.setHex(0x00ffff);
	};

	return (
		<mesh
			ref={ref}
			onPointerOver={hover}
			onPointerOut={unhover}
			layers={[0, 1]}
			castShadow
		>
			{window.innerWidth > 768 && <Html className={cn.container}>
				<ActionList data={data} selected={selected} />
			</Html>}
			<sphereBufferGeometry args={[0.7, 16, 16]} />
			<meshStandardMaterial color={0xffffff} />
		</mesh>
	);
}

export default memo(ProjectBall);
