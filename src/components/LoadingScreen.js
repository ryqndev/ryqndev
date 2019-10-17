import React from 'react';
import './styles/LoadingScreen.css';
import './styles/animations.css';

const LoadingBar = ({progress}) => {
    return (
        <div className="loading-top" style={{'width': progress + 'vw'}}></div>
    );
}
const LoadingContent = ({progress}) => {
    return (
        <div className="loading-content--wrapper">
            <div className="loading-content--name">
                Ryan Yang
            </div>
            <div className="loading-content--position">
                frontend developer // swe
            </div>
            <div className="loading-content--load-icon">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div className="loading-content--bar"></div>
        </div>
    );
}

const LoadingScreen = ({progress = 0}) => {
    return (
        <div>
            <LoadingBar progress={progress}/>
            <LoadingContent />
        </div>
    );
}


export default LoadingScreen;