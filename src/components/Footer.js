import React from 'react';
import Icons from './Icons';
import WebLink from './WebLink';
import './styles/Footer.css';

const Footer = () => {
    return (
        <div className="footer-wrapper">
            <div className="footer-top">
                <div className="footer-top--name">
                    RYAN YANG
                </div>
                <div className="footer-top--socials">
                    <Icons />
                </div>
            </div>
            <div className="footer-bottom">
                <div className="footer-bottom--me">
                    <span> me </span>
                    <br />
                    <WebLink text="instagram" link="https://instagram.com/lotsofsbux" />
                    <br />
                    <WebLink text="email" link="mailto:rqyang.uci.edu" />
                </div>
                <div className="footer-bottom--projects">
                    <span> projects </span>
                    <br />
                    <WebLink text="boba watch" link="https://info.boba.watch" />

                </div>
                <div className="footer-bottom--more">
                    <span> more </span>
                    <br />
                    <WebLink text="boba insta" link="https://instagram.com/bingeboba" />
                </div>
            </div>
            <div className="footer-made-with">
                Made with <span role="img" aria-label="love">❤️</span> at UCI on sbux coffee & boba
            </div>
        </div>
    );
}

export default Footer;