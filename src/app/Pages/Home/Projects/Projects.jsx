import React, { memo } from 'react';
import Project from './Project';
import './Projects.scss';

import bobaWatchImage from '../../../assets/images/boba_watch.png';
import pickBanProImage from '../../../assets/images/pickbanpro.png';
import webDevImage from '../../../assets/images/webdev.jpeg';

const data = [
	{
		id: 'pick-ban-pro',
		name: 'Pick Ban Pro',
		type: 'Web App',
		year: 2021,
		image: pickBanProImage,
	},
	{
		id: 'boba-watch',
		name: 'Boba Watch',
		type: 'Progressive Web App',
		year: 2019,
		image: bobaWatchImage,
	},
	{
		id: 'learn-ryqn-dev',
		name: 'learn.ryqn.dev',
		type: 'Coding Tutorials',
		year: 2019,
		image: webDevImage,
	},
];

const Projects = () => {
	return (
		<section>
			<div className='ps-w'>
				<div className='ps-h'>
					<h2 id="projects">Projects</h2>
				</div>
				<div id='ps-project'>
					{data.map(e => (
						<Project key={e.id} {...e} />
					))}
				</div>
			</div>
		</section>
	);
};

export default memo(Projects);
