import { ThreeContainer, Cube, UCI } from '../../../../components';
import cn from './Timeline.module.scss';

function Timeline() {
	return (
		<div className={cn.container}>
			<ThreeContainer className={cn.container}>
				<Cube position={[3, 50, 3]} />
				<Cube position={[-3, 30, -3]} />
				<UCI />
			</ThreeContainer>
		</div>
	);
}

export default Timeline;
