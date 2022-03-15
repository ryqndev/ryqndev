import { memo } from 'react';
import { ReactComponent as Github } from './assets/github.svg';
import { ReactComponent as Instagram } from './assets/instagram.svg';
import { ReactComponent as Linkedin } from './assets/linkedin.svg';
import cn from './Socials.module.scss';

const socials = [
	{ link: 'https://linkedin.com/in/ryanqyang', Icon: Linkedin },
	{ link: 'https://github.com/ryqndev', Icon: Github },
	{ link: 'https://www.instagram.com/bingeboba/', Icon: Instagram },
	{ link: 'https://www.instagram.com/veryfewsbux/', Icon: Instagram },
];

function Socials() {
	return (
		<div className={cn.container}>
			{socials.map(({link, Icon}) => (
				<a
					key={link}
					target='_blank'
					rel='noopener noreferrer'
					href={link}
				>
					<Icon
						data-mouse-hover='link'
						data-mouse-hover-text='open link in new tab'
					/>
				</a>
			))}
		</div>
	);
}

export default memo(Socials);
