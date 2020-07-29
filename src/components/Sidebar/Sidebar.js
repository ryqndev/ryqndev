import React, {useState} from 'react';
import './Sidebar.scss';
import gmailIcon from '../../assets/icons/gmail.svg';
import twitterIcon from '../../assets/icons/twitter.svg';
import githubIcon from '../../assets/icons/github.svg';
// import instagramIcon from '../../assets/icons/instagram.svg';
import {ReactComponent as SocialTriggerIcon} from '../../assets/icons/social_trigger.svg';

const iconOrder = [
    {
        'img': githubIcon,
        'type': 'github',
        'link': 'https://github.com/ryqndev'
    },
    {
        'img': twitterIcon,
        'type': 'twitter',
        'link': 'https://twitter.com/ryqndev'
    },
    {
        'img': gmailIcon,
        'type': 'gmail',
        'link': 'mailto:rqyang@uci.edu'
    }
];

const Icon = ({data}) => {
    return (
        <div className="icon-holder">
            <a
                className="icon"
                style={{backgroundImage: `url('${data.img}')`}}
                aria-label={data.type}
                href={data.link}
                target="_blank"
                rel="noopener noreferrer"
            >
            </a>
        </div>
    );
}

const Sidebar = () => {
    const [open, setOpen] = useState(false);
    return (
        <div className={`social-trigger ${open ? "open" : ""}`} onClick={() => {setOpen(!open)}}>
            <SocialTriggerIcon />
            <aside className="social-popup">
                {iconOrder.map(social => <Icon data={social}/>)}
            </aside>
        </div>
    )
}

export default Sidebar;
