import { memo, useRef } from 'react';
import { useScroll } from '../../controller';
import { useProject } from './controller';
import { ScrollableNotice } from '../../components';
import {
	BackgroundText,
	Curtain,
	PageOverlay,
	Project,
	ProjectName,
	Timeline,
	Timespan,
} from './components';
import PROJECTS from '../../assets/projects.json';
import cn from './Home.module.scss';

const Home = ({ theme }) => {
	const projectsRef = useRef(null);
	const { y } = useScroll();
	const { project, setProject } = useProject(y, projectsRef);

	return (
		<main className={cn.container}>
			<div className={cn.header}>
				{y < window.innerHeight * 1.5 && <Curtain y={y} />}
			</div>
			<BackgroundText y={y}/>
			<div
				className={cn.content}
				style={{ height: (PROJECTS.length - 1) * 200 + 'vh' }}
				ref={projectsRef}
			>
				<Timeline theme={theme} y={y} project={project}>
					<PageOverlay
						pages={PROJECTS}
						project={project}
						setProject={setProject}
					/>
					{PROJECTS?.[project] && (
						<>
							<Timespan {...PROJECTS[project].date} />
							<ProjectName name={PROJECTS[project].name} />
						</>
					)}
					<Project project={project}/>
				</Timeline>
			</div>
			<ScrollableNotice />
		</main>
	);
};

export default memo(Home);
