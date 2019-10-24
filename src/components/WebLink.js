import React from 'react';
import './styles/WebLink.css';

const WebLink = ({text, link}) => {
    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
        >
            {text}
        </a>
    );
}

export default WebLink;