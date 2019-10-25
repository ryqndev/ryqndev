import React from 'react';
import './styles/BobaWatch.css';

const BobaWatch = () => {
    return (
        <div className="bwatch--wrapper">
            <div className="bwatch--description">
                <div className="bwatch-title--holder">
                    <div className="bwatch-title--logo"></div>
                    <div className="bwatch-title">
                        boba watch
                    </div>
                </div>
                <div className="bwatch-about">
                    <span> Founder and lead developer of Boba Watch. </span>
                    Boba watch is responsive PWA that helps users track, finance, 
                    and control their milk tea drinking habits. I developed 
                    Boba Watch using ReactJS and utilizing service workers 
                    for offline caching of the Firebase backend.
                </div>
                <div className="bwatch-about-after">

                </div>
            </div>
            <div className="bwatch--device">
                <div className="bwatch--layers">
                    <div id="layer-1" className="bwatch-layer"></div>
                    <div id="layer-2" className="bwatch-layer"></div>
                    <div id="layer-3" className="bwatch-layer"></div>
                </div>
            </div>
        </div>
    );
}

export default BobaWatch;