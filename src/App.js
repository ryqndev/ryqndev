import React, {useState} from 'react';
import LoadingScreen from './components/LoadingScreen';
import './App.css';


//01010011 00101000 01101000 01100101 00101001 00100000 01100010 01100101 00101000 01101100 01101001 01100101 00101001 01110110 01100101 00101000 01100100 00101001

function App() {
    const [progress, setProgress] = useState(0);
    // setTimeout(() => {  setProgress(84) }, 1000);
    return (
        <div className="site-wrapper">
            <LoadingScreen progress={progress}/>
        </div>
    );
}

export default App;
