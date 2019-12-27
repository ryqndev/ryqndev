import React from 'react';
import './Sidebar.scss';
import Icons from '../Icons/Icons';

const Sidebar = () => {
    return (
        <aside className="s-w">
            <div className="s-c">
                find me here   
                <div className="social">
                    <Icons />
                </div>
            </div>
        </aside>
    )
}

export default Sidebar;
