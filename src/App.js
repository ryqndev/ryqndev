import React, {useState, useEffect, useRef} from 'react';
import Projects from './components/Projects/Projects';
import Footer from './components/Footer/Footer';
import './App.css';

const App = () => {
    const [scroll, setScroll] = useState(0);
    const scrolled = useRef(setScroll);

    useEffect(() => {
        let site = document.getElementById('w');
        scrolled.current(site.scrollTop);
        site.addEventListener('scroll', (e) => {
            scrolled.current(site.scrollTop);
        });
    }, []);

    return (
        <div id="w">
            <Projects scroll={scroll}/>
            <Footer />
        </div>
    );
}

export default App;
