import React from 'react';
import './Header.css';
import '../../globals/animations.scss';

const Header = ({scroll}) => {
    return (
        <header className="h-w">
            <div className="special-square">
                <div className="special-square-inner">
                    <div className="h-name front" style={{
                        transform: `rotate(-${scroll/20}deg)`
                    }}>
                        RYAN YANG
                    </div>
                </div>
            </div>
            <div className="h-name behind" style={{
                        transform: ` scale(${1 + scroll/3000})`
                    }}>
                RYAN YANG
            </div>
        </header>
    );
}

export default Header;