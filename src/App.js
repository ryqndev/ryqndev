import React, {useState} from 'react';
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
    const [progress, setProgress] = useState(1);
    setTimeout(() => {  setProgress(100) }, 3000);

    return (
        <div className={"site-wrapper" + (progress >= 100 ? " ld" : "")}>
            <Loading progress={progress} />
            <Navigation />
            <Header />
            <BobaWatch />
            <Footer />
        </div>
    );
}

export default App;
