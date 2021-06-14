import { memo } from 'react';
import Projects from './Projects';
import About from './About';
import { ScrollableNotice } from '../../components';
import useScroll from '../../controller/hooks/useScroll';
import './Home.scss';

const Home = ({ name = '杨秋睿' }) => {
	useScroll();

	return (
		<>
			<div className='header-placeholder'>
				<header className='h-w'>
					<h1 className='name behind'>{name}</h1>
					<div className='fake-border'>
						<div className='fake-border--content'>
							<h1 className='name front'>{name}</h1>
						</div>
					</div>
					<ScrollableNotice />
				</header>
			</div>
			<About />
			<Projects />
		</>
	);
};

export default memo(Home);
