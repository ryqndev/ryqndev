import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as ChineseName } from '../../assets/chinese.svg';
import { ReactComponent as EnglishName } from '../../assets/english.svg';
import { ReactComponent as GithubIcon } from '../../assets/icons/github.svg';
import { ReactComponent as GmailIcon } from '../../assets/icons/gmail.svg';
import { ReactComponent as PortfolioIcon } from '../../assets/icons/light-logo.svg';
import ProfileImage from '../../assets/images/profile-transparent-square.png';
import cn from './Footer.module.scss';

const Footer = () => {
	return (
		<footer className={cn.wrapper}>
			<div className={cn.background}>
				<ChineseName />
				<div className={cn['made-with--note']}>
					Made with{' '}
					<span role='img' aria-label='love'>
						❤️
					</span>{' '}
					in irvine on sbux{' '}
					<span role='img' aria-label='coffee'>
						☕
					</span>{' '}
					& boba
				</div>
			</div>
			<div className={cn.profile}>
				<img src={ProfileImage} alt='Ryan Yang Profile' />
				<EnglishName />
				<div className={cn.icons}>
					<a href='https://ryqn.dev/'>
						<PortfolioIcon />
					</a>
					<a href='https://github.com/ryqndev'>
						<GithubIcon />
					</a>
					<a href='mailto:ryanqyang@gmail.com'>
						<GmailIcon />
					</a>
				</div>
			</div>
			<div className={cn.articles}>
				<h3>Featured Articles</h3>
				<a
					href='https://dailybruin.com/2019/10/22/app-developed-by-students-allows-users-to-track-boba-purchases-unites-community'
					className={cn.article}
				>
					<h4>Daily Bruin</h4>
					<time dateTime='2019-10-22'>Oct 22, 2019</time>
					<span>
						App developed by students allows users to track boba
						purchases, unites community
					</span>
				</a>
				<a
					href='https://www.cs.uci.edu/student-spotlight-ryan-yang-and-the-instant-popularity-of-boba-watch/'
					className={cn.article}
				>
					<h4>UCI CS</h4>
					<time dateTime='2019-10-18'>Oct 18, 2019</time>
					<span>
						Student Spotlight: Ryan Yang and the Instant Popularity
						of Boba Watch
					</span>
				</a>
				<a
					href='https://theindependent.sg/college-kids-create-app-tracking-bubble-tea-expenses/'
					className={cn.article}
				>
					<h4>Independent</h4>
					<time dateTime='2019-10-13'>Oct 13, 2019</time>
					<span>
						College kids create app tracking bubble tea expenses
					</span>
				</a>
				<a
					href='https://nextshark.com/boba-watch-app-college-students/'
					className={cn.article}
				>
					<h4>Next Shark</h4>
					<time dateTime='2019-10-11'>Oct 11, 2019</time>
					<span>
						Genius College Students Create a ‘Boba Watch’ App to
						Track Milk Tea Expenses
					</span>
				</a>
				<a
					href='https://mothership.sg/2019/10/boba-watch/'
					className={cn.article}
				>
					<h4>MothershipSG</h4>
					<time dateTime='2019-10-10'>Oct 10, 2019</time>
					<span>
						Bubble tea app to track consumption & spending made by
						Subtle Asian Traits members
					</span>
				</a>

				<h3>Projects</h3>
				<Link to='/pick-ban-pro' className={cn.article}>
					<h4>Pick Ban Pro</h4>
					<time dateTime='2021-5'>May 2021</time>
					<span>https://pickban.pro</span>
				</Link>
				<Link to='/boba-watch' className={cn.article}>
					<h4>Boba Watch</h4>
					<time dateTime='2019-10'>Oct 2019</time>
					<span>https://boba.watch</span>
				</Link>
			</div>
		</footer>
	);
};

export default memo(Footer);
