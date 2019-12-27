import React from 'react';
import Icons from '../Icons/Icons';
import WebLink from '../WebLink/WebLink';
import './Footer.scss';

const Footer = () => {
    return (
        <footer className="f-w">
            <div className="top">
                <div className="name">
                    RYAN YANG
                </div>
                <div className="socials">
                    <Icons />
                </div>
            </div>
            <div className="footer-bottom">
                <div>
                    <span> me </span>
                    <WebLink text="instagram" link="https://instagram.com/lotsofsbux" />
                    <WebLink text="email" link="mailto:rqyang.uci.edu" />
                </div>
                <div>
                    <span> projects </span>
                    <WebLink text="boba watch" link="https://info.boba.watch" />
                    <WebLink text="intro to web" link="https://github.com/ryqndev/Intro-to-Web-Dev" />
                </div>
                <div>
                    <span> more </span>
                    <WebLink text="boba insta" link="https://instagram.com/bingeboba" />
                </div>
            </div>
            <div className="made-with">
                Made with <span role="img" aria-label="love">❤️</span> at UCI on sbux <span role="img" aria-label="coffee">☕</span> & boba
            </div>
        </footer>
    );
}

export default Footer;