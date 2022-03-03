import { memo, useRef } from 'react';
import { useScroll } from '../../controller';
import { useProject } from './controller';
import { ScrollableNotice } from '../../components';
import {
	BackgroundText,
	Curtain,
	LanguageSelect,
	PageOverlay,
	Project,
	ProjectName,
	Socials,
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
			<BackgroundText visible={y > window.innerHeight/2}/>
			<div
				className={cn.content}
				style={{ height: (PROJECTS.length - 1) * 200 + 'vh' }}
				ref={projectsRef}
			>
				<Timeline theme={theme} project={project} y={y}>
					{(window.innerWidth > 680) && <PageOverlay
						pages={PROJECTS}
						project={project}
						setProject={setProject}
					/>}
					<LanguageSelect />
					{PROJECTS?.[project] && (
						<>
							<Timespan {...PROJECTS[project].date} />
							<ProjectName name={PROJECTS[project].displayName} y={y} />
						</>
					)}
					<Socials />
				</Timeline>
			</div>
			<ScrollableNotice />
		</main>
	);
};

export default memo(Home);
