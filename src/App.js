import React, {useState, useEffect, useRef} from 'react';
import Toggle from './components/Toggle/Toggle';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import Projects from './components/Projects/Projects';
import Footer from './components/Footer/Footer';
import Theme from './globals/Theme';
import './App.css';

const App = () => {
    const [dark, toggleDark ] = useState(true);
    const [scroll, setScroll] = useState(0);
    
    const scrolled = useRef(setScroll);
    const site     = useRef(null);
    
    useEffect(() => { Theme(dark) }, [dark]);

    useEffect(() => {
        let wrapper = site.current;
        let updateScroll = () => {scrolled.current(wrapper.scrollTop)}

        updateScroll();
        wrapper.addEventListener('scroll', updateScroll);

        return () => {
            wrapper.removeEventListener('scroll', updateScroll);
        }
    }, []);

    return (
        <div id="w" ref={site}>
            <Toggle cur={dark} set={toggleDark}/>
            <Sidebar />
            <Header scroll={scroll} />
            <Projects />
            <Footer />
        </div>
    );
}

export default App;
