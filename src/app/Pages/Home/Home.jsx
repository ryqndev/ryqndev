import { memo, useEffect } from 'react';
import Projects from './Projects';
import About from './About';
import { ScrollableNotice } from '../../components';
import useScroll from '../../controller/hooks/useScroll';
import AOS from 'aos';
import './Home.scss';

const Home = ({ name = '杨秋睿' }) => {
	useScroll();

	return (
		<div className='page--wrapper'>
			<div className='header-placeholder'></div>
			<header className='h-w'>
				<h1 className='name behind'>{name}</h1>
				<div className='fake-border'>
					<div className='fake-border--content'>
						<h1 className='name front'>{name}</h1>
					</div>
				</div>
				<ScrollableNotice />
			</header>

			<div className='content'>
				<About />
				<Projects />
			</div>
		</div>
	);
};

export default memo(Home);
