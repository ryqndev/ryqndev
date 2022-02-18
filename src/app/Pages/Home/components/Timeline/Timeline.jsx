import { memo } from 'react';
import { ThreeContainer, Cube, UCI } from '../../../../components';
import cn from './Timeline.module.scss';

function Timeline({ theme, y, children, ...props }) {
	return (
		<div className={cn.container} {...props}>
			<ThreeContainer className={cn.container} theme={theme}>
				<Cube position={[3, 50, 3]} />
				<Cube position={[-3, 30, -3]} />
				<UCI y={y} />
			</ThreeContainer>
			{children}
		</div>
	);
}

export default memo(Timeline);
