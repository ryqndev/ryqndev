import { memo } from 'react';
import { ThreeContainer, ProjectBall, UCI } from '../../../../components';
import PROJECTS from '../../../../assets/projects.json';
import cn from './Timeline.module.scss';

function Timeline({ theme, project, y, children, ...props }) {
	return (
		<div className={cn.container} {...props}>
			<ThreeContainer className={cn.container} theme={theme} project={project} y={y}>
				{PROJECTS.map((data, index) => (
					<ProjectBall
						key={data.name}
						data={data}
						selected={project === index}
					/>
				))}
				<UCI />
			</ThreeContainer>
			{children}
		</div>
	);
}

export default memo(Timeline);
