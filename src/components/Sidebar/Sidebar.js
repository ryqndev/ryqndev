import React from 'react';
import './Sidebar.scss';
import Icons from '../Icons/Icons';

const Sidebar = () => {
    return (
        <aside className="s-w">
            <div className="s-c">
                <div className="s-line top"></div>
                <div className="social">
                    <Icons />
                </div>
                <div className="s-line bottom"></div>
            </div>
        </aside>
    )
}

export default Sidebar;
