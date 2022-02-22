import { memo } from 'react';
import { ReactComponent as Github } from './assets/github.svg';
import { ReactComponent as Instagram } from './assets/instagram.svg';
import { ReactComponent as Linkedin } from './assets/linkedin.svg';
import cn from './Socials.module.scss';

function Socials() {
	return (
		<div className={cn.container}>
			<a
				target='_blank'
				rel='noopener noreferrer'
				href='https://linkedin.com/in/ryanqyang'
			>
				<Linkedin />
			</a>
			<a
				target='_blank'
				rel='noopener noreferrer'
				href='https://github.com/ryqndev'
			>
				<Github />
			</a>
			<a
				target='_blank'
				rel='noopener noreferrer'
				href='https://www.instagram.com/bingeboba/'
			>
				<Instagram />
			</a>
			<a
				target='_blank'
				rel='noopener noreferrer'
				href='https://www.instagram.com/veryfewsbux/'
			>
				<Instagram />
			</a>
		</div>
	);
}

export default memo(Socials);
