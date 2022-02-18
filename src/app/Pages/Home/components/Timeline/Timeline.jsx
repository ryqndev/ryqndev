import { memo } from 'react';
import { ThreeContainer, ProjectBall, UCI } from '../../../../components';
import PROJECTS from '../../../../assets/projects.json';
import cn from './Timeline.module.scss';

function Timeline({ theme, y, project, children, ...props }) {
	return (
		<div className={cn.container} {...props}>
			<ThreeContainer className={cn.container} theme={theme}>
				{PROJECTS.map((data, index) => (
					<ProjectBall
						key={data.name}
						data={data}
						selected={project === index}
					/>
				))}
				<UCI y={y} />
			</ThreeContainer>
			{children}
		</div>
	);
}

export default memo(Timeline);
