import React, {useEffect, useState, useRef} from 'react';
import './styles/HeaderScreen.css';
import './styles/animations.css';

const HeaderBar = ({pr}) => {
    useEffect(() => {
        if(pr >= 100)
            setTimeout(() => { document.getElementById('header-top').style.opacity = 0; }, 4000);
    }, [pr]);
    return (
        <div id="header-top" style={{width: pr + 'vw'}}></div>
    );
}
const HeaderContent = ({loaded}) => {
    return (
        <div className={"header-content--wrapper" + (loaded? " loaded":"")}>
            <div className="header-content--name">
                <div className="glitch">Ryan Yang</div>
            </div>
            <div className="header-content--position">
                frontend developer // swe
            </div>
            <div className={"header--load-icon" + (loaded ? " loaded":"")}>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>            
            <div className="header-content--bar"></div>
            <div className="header--icons"></div>
        </div>
    );
}

/**
 * @hook HeaderScreen - Entire header component
 * @param {Number} pr - loading progress. number between [0 - 100] 
 */
const HeaderScreen = ({progress = 0}) => {
    const [finishLoad, setFinishLoad] = useState(false);
    const finishLoadRef = useRef(setFinishLoad);
    finishLoadRef.current = setFinishLoad;
    useEffect(() => {
        if(progress >= 100){
            setTimeout(() => {
                finishLoadRef.current(true);
            }, 4000);
        }
    }, [progress]);
    return (
        <div>
            <HeaderBar pr={progress}/>
            <HeaderContent loaded={finishLoad}/>
        </div>
    );
}


export default HeaderScreen;