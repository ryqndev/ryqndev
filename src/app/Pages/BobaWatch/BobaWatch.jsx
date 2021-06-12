import { memo } from 'react';
import BobaWatchSplashBannerImage from '../../assets/images/splash-min.png';
import { ScrollableNotice, Footer } from '../../Components';
import BackLink from '../../Components/BackLink/BackLink';
import useScroll from '../../controller/hooks/useScroll';
import './BobaWatch.scss';

const BobaWatch = () => {
	const site = useScroll();
	return (
		<article className='boba-watch--wrapper' ref={site}>
			<div style={{ position: 'relative' }}>
				<ScrollableNotice flipped />
			</div>
			<aside>
				<span>boba watch</span> - a case study
			</aside>
			<figure className='hero'>
				<BackLink to='/' pageName='projects' />
				<div className='bwatch--layers'>
					<div id='layer-1' className='bwatch-layer' style={{}}></div>
					<div id='layer-2' className='bwatch-layer'></div>
					<div id='layer-3' className='bwatch-layer'></div>
				</div>
			</figure>

			<h1>boba watch</h1>

			<div className='description'>
				I founded <span>Boba Watch</span> - a Progressive Web App that
				helps users keep track of and analyze their drink spending - in
				April of 2019. Using a <span>React</span>/SASS/Firebase tech
				stack, I built the app from the ground up and designed the
				infrastructure currently in place to support high level
				production features such as <span>i18n</span> for thousands of
				users.
			</div>
			<div className='image-expand--holder'>
				<img
					src={BobaWatchSplashBannerImage}
					alt='Boba Watch case study splash'
					className='splash'
				/>
			</div>

			{/* <div className="description light">
                <h3>the hackathon</h3>
                The idea for Boba Watch came up during LAHacks2019 - the preeminent hackathon at UCLA - in which we immediately decided would be our submission. The team, consisting of our graphic designer Callista Wu, backend engineer Alexander Chen, and I, were inspired by members of the facebook group, Subtle Asian Traits, posting their excel spreadsheets tracking their boba spending and realized that we could automate this tedious process. The idea was simple: an app to keep track of your boba spending. Nothing more, nothing less. From the very start, we knew that this app would not carry much societal impact, nor would it break technological barriers and so focused our talents on creating the cleanest, coolest, "memey" app instead. 

                Since we only had 36 hours to work on this app from scratch, we divvyed up the work accordingly. Callista would design the app using Figma and I would develop the front-end for it. Alex, our backend engineer, was tasked with managing a database for our users as well as creating an api for which the front-end would communicate with. The backend stack for the duration of the hackathon would be a PostGres database served over a Node.js api running express and sequelize - both of which were hosted on Google Cloud Platform. You can see the hackathon-demo-ready code we were running <a href="https://github.com/alexanderqchen/boba-watch-backend">here</a> preserved in all it's glory.
            </div>

            <div className="description light">
                <h3>Front-end development</h3>
                At a hackathon, our development time is short. When you're a front-end developer working with a designer, you have even less time as you need to wait for the designs to come in first. With these time constraints in mind - I reached for several tools which made prototyping a breeze but would later need to be removed as to not accumulate tech debt. Because we were developing a full app with multiple pages, reusable components, and dynamically loaded page content, it didn't make much sense to use plain HTML/CSS/JS so I decided to use React as not only was it the most popular, but the most comfortable as well. The styling library I ended up adopting was Material UI. This made rapid development a breeze but since we had a designer and our own style guide to follow, I found myself employing <code>!important</code> and other hacky solutions often which made the eventual refactoring much more difficult.
            </div>

            <div className="description light">
                <h3>Release</h3>
                After the hackathon, we had a shaky but usable prototype. I decided that I wanted to continue to work on this app and release it for people to use and so I worked for 6 months to rewrite the core infrastructure and patch all security vulnerabilities we created to make the demo usable. The first thing was to change our backend structure. Since our backend developer had other priorities and I wasn't comfortable working not only a database, but a separate server as well, I decided to use Firestore as a BaaS. Keeping the database structure set forth by Alex, converting over was relatively easy.

                During our release, we had over 2 thousand sign-ups within the first hour and due to the scaling nature of Firestore, we were able to accomodate all of our users and never went above the free tier. I kept all of our server calls to a minimum by keeping as much of the logic in the client-side which meant we were going to have sync issues but it kept us from having to pay for server usage. Today, we have several thousand registered users and several hundred monthly average users.
            </div> */}
			<Footer />
		</article>
	);
};

export default memo(BobaWatch);
