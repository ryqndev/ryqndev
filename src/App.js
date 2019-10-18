import React, {useState, useEffect, useRef} from 'react';
import HeaderScreen from './components/HeaderScreen';
import BobaWatch from './components/BobaWatch';
import './App.css';


//01010011 00101000 01101000 01100101 00101001 00100000
//01100010 01100101 00101000 01101100 01101001 01100101
//00101001 01110110 01100101 00101000 01100100 00101001
//sbeve
function App() {
    const [progress, setProgress] = useState(5);
    const [header, setheader] = useState(false);
    const headerRef = useRef(setheader);
    headerRef.current = setheader;

    setTimeout(() => {  setProgress(100) }, 5000);

    let removeLoadScreen = () => {
        // setTimeout( () => { headerRef.current(true) }, 5000 );
        
    }

    useEffect(() => {
        if(progress >= 100) removeLoadScreen();
            
    }, [progress])

    return (
        <div className="site-wrapper">
            <HeaderScreen progress={progress} />
            <BobaWatch />
        </div>
    );
}

export default App;
