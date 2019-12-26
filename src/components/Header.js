import React from 'react';
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
                </div>
            </div>
        </div>
    );
}

export default Header;