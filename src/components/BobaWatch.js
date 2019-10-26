import React, {useEffect, useState} from 'react';
import { useSpring, animated } from 'react-spring'

import './styles/BobaWatch.css';

const BobaWatch = ({scroll}) => {
    const [state, toggle] = useState(true)
    // const { x } = useSpring({ from: { x: 0 }, x: state ? 14 : 0, config: { duration: 1000 } })
    const props = useSpring({ number: 13.8, from: { number: 0 } })
    useEffect(() => {
        document.documentElement.style.setProperty('--bwatch-scroll', Math.abs(7 - scroll * 0.005));
    }, [scroll]);
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
                <div className="bwatch-stats--wrapper">
                    <div className="bwatch-stats--item" onClick={() => toggle(!state)}>
                    <animated.span>{props.number.interpolate(val => val.toFixed(1))}</animated.span>k
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