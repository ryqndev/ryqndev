import React from 'react';
import Icons from '../Icons/Icons';
import WebLink from '../WebLink/WebLink';
import './Footer.scss';

const Footer = () => {
    return (
        <footer className="f-w">
            <div className="f-bg">
                ryan yang
            </div>
            <div className="made-with">
                Made with <span role="img" aria-label="love">❤️</span> at UCI on sbux <span role="img" aria-label="coffee">☕</span> & boba
            </div>
        </footer>
    );
}

export default Footer;