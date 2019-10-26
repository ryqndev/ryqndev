import React, {useState, useEffect, useRef} from 'react';
import Loading from './components/Loading';
import Navigation from './components/Navigation';
import Header from './components/Header';
import BobaWatch from './components/BobaWatch';
import Footer from './components/Footer';
import './App.css';

//01010011 00101000 01101000 01100101 00101001 00100000
//01100010 01100101 00101000 01101100 01101001 01100101
//00101001 01110110 01100101 00101000 01100100 00101001
//sbeve

const App = () => {
    const [progress, setProgress] = useState(localStorage.getItem('loaded') ? 100 : 1);
    const [scroll, setScroll] = useState(0);
    const scrollRef = useRef(setScroll);   

    setTimeout(() => { 
        localStorage.setItem('loaded', true);
        setProgress(100);
    }, 3000);

    useEffect(() => {
        document.getElementById('site-wrapper').addEventListener('scroll', (e) => {
            scrollRef.current(document.getElementById('site-wrapper').scrollTop);
        });
    }, []);
    return (
        <div id="site-wrapper" className={(progress >= 100 ? " ld" : "")}>
            <Loading progress={progress} />
            <Navigation scroll={scroll} />
            <Header />
            <BobaWatch scroll={scroll} />
            <Footer />
        </div>
    );
}

export default App;
