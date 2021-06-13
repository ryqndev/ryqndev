import { memo } from 'react';
import Projects from './Projects';
import About from './About';
import { ScrollableNotice, Footer } from '../../components';
import useScroll from '../../controller/hooks/useScroll';
import './Home.scss';

const Home = ({name='杨秋睿'}) => {
	const site = useScroll();

	return (
		<div id='w' ref={site}>
			<div className='header-placeholder'>
				<header className='h-w'>
					<div className='h-name behind'>{name}</div>
					<div className='special-square'>
						<div className='special-square-inner'>
							<div className='h-name front'>{name}</div>
						</div>
					</div>
					<ScrollableNotice />
				</header>
			</div>
			<About />
			<Projects />
			<Footer />
		</div>
	);
};

export default memo(Home);
