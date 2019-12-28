import React from 'react';
import './Icon.css';
import gmailIcon from '../../assets/icons/gmail.svg';
import twitterIcon from '../../assets/icons/twitter.svg';
import githubIcon from '../../assets/icons/github.svg';
import instagramIcon from '../../assets/icons/instagram.svg';

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
    },
    {
        'img': instagramIcon,
        'type': 'instagram',
        'link': 'https://instagram.com/lotsofsbux'
    }
];

const Icons = () => {
    return iconOrder.map(e => <Icon key={e.type} data={e} />)
}
const Icon = (d) => {
    return (
        <a
            className="icon"
            style={{backgroundImage: `url('${d.data.img}')`}}
            aria-label={d.data.type}
            href={d.data.link}
            target="_blank"
            rel="noopener noreferrer"
        >
        </a>
    );
}

export default Icons;