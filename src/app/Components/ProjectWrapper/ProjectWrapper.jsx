import { useEffect } from 'react';
import BackLink from '../../components/BackLink/BackLink';
import { wrapper } from './ProjectWrapper.module.scss';
import clsx from 'clsx';

const ProjectWrapper = ({ name, children, className }) => {
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	return (
		<main className={clsx(wrapper, className)}>
			<nav>
				<BackLink to='/#projects' pageName='projects' />
			</nav>
			<aside>
				<span>{name}</span> - a case study
			</aside>
			{children}
		</main>
	);
};

export default ProjectWrapper;
