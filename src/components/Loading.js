import React from 'react';
import './styles/Loading.css';
import './styles/animations.css';

const load = (loaded) => { return loaded ? " ld": "" }

/**
 * @component loadingComponent
 * @param {*} progress 
 */
const Loading = ({progress}) => {
    let ld = progress >= 100;
    return (
        <div className={`loading-wrapper ${load(ld)}`}>
            <div className={'loading-content--wrapper' + load(ld)}>
                <div className="loading-content--name">
                    <div className="glitch">
                        RYAN YANG
                    </div>
                </div>
                <div id="loading-bar" style={{backgroundSize: progress + '%'}} className={load(ld)}></div>
                <div className={'loading-content--position' + load(ld)}> frontend // swe </div>
            </div>
        </div>
    );
}
export default Loading;