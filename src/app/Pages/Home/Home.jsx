import React, {useState, useEffect, useRef} from 'react';
import Projects from './Projects';
import './Home.scss';

const Home = () => {
    const [scroll, setScroll] = useState(0);

    const scrolled = useRef(setScroll);
    const site = useRef(null);
    
    useEffect(() => {
        let wrapper = site.current;
        let updateScroll = () => {scrolled.current(wrapper.scrollTop)}

        updateScroll();
        wrapper.addEventListener('scroll', updateScroll);

        return () => {
            wrapper.removeEventListener('scroll', updateScroll);
        }
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty('--scroll-small', scroll / 300);
        document.documentElement.style.setProperty('--scroll-big', scroll / -20 + 'deg');
    }, [scroll])

    return (
        <div id="w" ref={site}>
            <header className="h-w">
                <div className="special-square">
                    <div className="special-square-inner">
                        <div className="h-name front">
                            RYAN YANG
                        </div>
                    </div>
                </div>
                <div className="h-name behind">
                    RYAN YANG
                </div>
                <div className="icon-scroll">
                    <div className="mouse">
                        <div className="wheel"></div>
                    </div>
                    <div className="icon-arrows">
                        <span></span>
                    </div>
                </div>
            </header>
            
            <Projects />
            
            <footer className="f-w">
                <div className="f-bg">
                    ryan yang
                </div>
                <div className="made-with">
                    Made with <span role="img" aria-label="love">❤️</span> at UCI on sbux <span role="img" aria-label="coffee">☕</span> & boba
                </div>
            </footer>
        </div>
    );
}

export default Home;