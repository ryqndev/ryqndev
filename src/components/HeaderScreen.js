import React, {useEffect, useState, useRef} from 'react';
import './styles/HeaderScreen.css';
import './styles/animations.css';

const HeaderContent = ({progress}) => {
    let ld = progress >= 100;
    return (
        <div className={`header-content--wrapper ${ld ? "ld": ""}`}>
            <div className="header-content--name">
                <div className="glitch">RYAN YANG</div>
            </div>
            <div id="header-bar" style={{backgroundSize: `${progress}%`}} className={ld ? "ld" : ""}></div>
            <div className={`header-content--position ${ld ? "ld" : ""}`}>frontend // swe</div>
        </div>
    );
}

/**
 * @hook HeaderScreen - Entire header component
 * @param {Number} pr - loading progress. number between [0 - 100] 
 */
const HeaderScreen = ({progress = 0}) => {
    return (
        <div className={`header-wrapper ${progress >= 100 ? "ld": ""}`}>
            <HeaderContent progress={progress}/>
        </div>
    );
}


export default HeaderScreen;