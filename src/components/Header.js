import React from 'react';
import Icons from './Icons';
import './styles/Header.css';
import './styles/animations.css';

const Header = () => {
    return (
        <div className="header-wrapper">
            <div className="header-profile">
                <div className="header-profile--name">
                    <div className="glitch-small">
                        RYAN YANG
                    </div>
                    <div className="header-icon--wrapper">
                        <Icons />
                    </div>
                </div>
            </div>
            <div className="header-image">
                <div className="header--side-text">
                    <span> <b>⟨ ⟨</b>&#160;━ </span>&#160;<i> BOBA WATCH </i> &#160;<span> ━━━ </span>
                </div>
            </div>
        </div>
    );
}

export default Header;