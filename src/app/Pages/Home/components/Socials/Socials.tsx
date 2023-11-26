import Github from '@assets/icons/minimal/github.svg?react';
import Instagram from '@assets/icons/minimal/instagram.svg?react';
import Linkedin from '@assets/icons/minimal/linkedin.svg?react';
import cn from './Socials.module.scss';

const socials = [
    { link: 'https://linkedin.com/in/ryanqyang', Icon: Linkedin },
    { link: 'https://github.com/ryqndev', Icon: Github },
    { link: 'https://www.instagram.com/bingeboba/', Icon: Instagram },
    { link: 'https://www.instagram.com/veryfewsbux/', Icon: Instagram },
];

export function Socials() {
    return (
        <div className={cn.container}>
            {socials.map(({ link, Icon }) => (
                <a
                    key={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    href={link}
                >
                    <Icon
                        data-mouse-hover="link"
                        data-mouse-hover-text="open link in new tab"
                    />
                </a>
            ))}
        </div>
    );
}
