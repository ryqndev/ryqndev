import React, {useEffect, useState, useRef} from 'react';
import './styles/HeaderScreen.css';
import './styles/animations.css';

const HeaderContent = ({progress}) => {
    return (
        <div className="header-content--wrapper">
            <div className="header-content--name">
                <div className="glitch">RYAN YANG</div>
            </div>
            <div id="header-bar" style={{width: progress + '%'}}
                className={progress >= 100 ? "loaded" : ""}>    
            </div>
        </div>
    );
}

/**
 * @hook HeaderScreen - Entire header component
 * @param {Number} pr - loading progress. number between [0 - 100] 
 */
const HeaderScreen = ({progress = 0}) => {
    useEffect(() => {
        if(progress >= 100){
            
        }
    }, [progress]);
    return (
        <div>
            <HeaderContent progress={progress}/>
        </div>
    );
}


export default HeaderScreen;