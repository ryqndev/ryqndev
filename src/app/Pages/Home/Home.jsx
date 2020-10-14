import React from 'react';
import Projects from './Projects';
import About from './About';
import {ScrollableNotice, Footer} from '../../Components';
import useScroll from '../../controller/hooks/useScroll';
import './Home.scss';

const Home = () => {
    const site = useScroll();

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
                <ScrollableNotice />
            </header>
            <About />
            <Projects />
            <Footer />
        </div>
    );
}

export default Home;