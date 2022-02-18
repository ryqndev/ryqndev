import { memo } from 'react';
import { useBox } from '@react-three/cannon';
import { ActionList } from './components';

function ProjectBall({ data, selected }) {
	const [ref] = useBox(() => ({
		mass: 1,
		position: [Math.random() * 15 - 7,  Math.random() * 5 + 10, Math.random() * 15 - 7],
	}));

	const hover = () => {
		ref.current.material.color.setHex(0xffffff);
	};
	const unhover = () => {
		ref.current.material.color.setHex(0x00ffff);
	};

	const click = () => {
		// ref.current.position.y = position[1];
	};

	return (
		<mesh
			ref={ref}
			onClick={click}
			onPointerOver={hover}
			onPointerOut={unhover}
		>
			<ActionList data={data} selected={selected} />
			<sphereBufferGeometry args={[0.7, 16, 16]} />
			<meshStandardMaterial color={0xffffff} />
		</mesh>
	);
}

export default memo(ProjectBall);
