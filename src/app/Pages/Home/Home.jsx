import { memo } from 'react';
import Projects from './Projects';
import About from './About';
import { ScrollableNotice } from '../../components';
import useScroll from '../../controller/hooks/useScroll';
import { ReactComponent as ChineseName } from '../../assets/chinese.svg';
import './Home.scss';

const Home = () => {
	useScroll();
	return (
		<div className='page--wrapper'>
			<div id='home' className='header-placeholder'></div>
			<header className='h-w'>
				<h1 className='name behind'>
					<ChineseName />
				</h1>
				<div className='fake-border'>
					<div className='fake-border--content'>
						<h1 className='name front'>
							<ChineseName />
						</h1>
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
