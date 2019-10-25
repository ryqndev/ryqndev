import React from 'react';
import './styles/BobaWatch.css';

const BobaWatch = () => {
    return (
        <div className="bwatch--wrapper">
            <div className="bwatch--description">
                <div className="bwatch-title">
                    boba watch
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