import React, {useEffect, useState} from 'react';
import { useSpring, animated } from 'react-spring'

import './styles/BobaWatch.css';

const BobaWatch = ({scroll}) => {
    const [props, set] = useSpring(() => ({  
        mau: 0,
        dau: 0,
        ru: 0
    }));
    useEffect(() => {
        document.documentElement.style.setProperty('--bwatch-scroll', Math.abs(7 - scroll * 0.007));
        if(document.getElementById('bwatch-wrapper--top').getBoundingClientRect().top + 100 <= window.innerHeight){
            set({
                mau: 14.1,
                dau: 1.2,
                ru: 5,
            });
        }
    }, [scroll]);
    return (
        <div className="bwatch--wrapper" >
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
                <div className="bwatch-stats--wrapper" id="bwatch-wrapper--top">
                    <div className="bwatch-stats--item" >
                        <div>
                            <animated.span>{props.mau.interpolate(val => val.toFixed(1))}</animated.span>k+
                        </div>
                        <br />
                        mau
                    </div>
                    <div className="bwatch-stats--item">
                        <div>
                            <animated.span>{props.dau.interpolate(val => val.toFixed(1))}</animated.span>k+
                        </div>
                        <br />
                        dau
                    </div>
                    <div className="bwatch-stats--item">
                        <div>
                        <animated.span>{props.ru.interpolate(val => val.toFixed(1))}</animated.span>k+
                        </div>
                        <br />
                        ru
                    </div>
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