import Projects from './Projects';
import About from './About';
import { ScrollableNotice, Footer } from '../../Components';
import useScroll from '../../controller/hooks/useScroll';
// import './Home.scss';
import './Testings.scss';

const Home = () => {
	const site = useScroll();
	// const name = 'RYAN YANG';
	const name = '杨秋睿';

	return (
		<div id='w' ref={site}>
            <div className="header-placeholder">
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

export default Home;
