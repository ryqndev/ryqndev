import { useEffect } from 'react';
import BackLink from '../../components/BackLink/BackLink';
import { wrapper } from './ProjectWrapper.module.scss';

const ProjectWrapper = ({ name, children }) => {
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	return (
		<main className={wrapper}>
			<BackLink to='/' pageName='projects' />
			<aside>
				<span>{name}</span> - a case study
			</aside>
			{children}
		</main>
	);
};

export default ProjectWrapper;
