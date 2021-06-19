import { memo, Suspense } from 'react';
import Projects from './Projects';
import About from './About';
import { ScrollableNotice } from '../../components';
import useScroll from '../../controller/hooks/useScroll';
import {ReactComponent as Chinese} from '../../assets/chinese.svg';
import './Home.scss';

const Home = () => {
	useScroll();

	return (
		<Suspense fallback={<h1>Loading fonts...</h1>}>
			<div className='page--wrapper'>
				<div id="home" className='header-placeholder'></div>
				<header className='h-w'>
					<h1 className='name behind'><Chinese /></h1>
					<div className='fake-border'>
						<div className='fake-border--content'>
							<h1 className='name front'><Chinese/></h1>
						</div>
					</div>
					<ScrollableNotice />
				</header>

				<div className='content'>
					<About />
					<Projects />
				</div>
			</div>
		</Suspense>
	);
};

export default memo(Home);
