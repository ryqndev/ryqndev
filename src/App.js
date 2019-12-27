import React, {useState, useEffect, useRef} from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
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
            <Sidebar />
            <Header scroll={scroll} />
            <Projects />
            <Footer />
        </div>
    );
}

export default App;
