import React, {useState, useEffect, useRef} from 'react';
import './styles/Navigation.css';

  
const Navigation = () => {
    const [mini, setMini] = useState(false);
    // document.getElementById('site-wrapper').addEventListener('scroll', (e) => {
    // ref.current = window.scrollY ? true : false;
    return (
        <div className={`nav-wrapper ${mini ? "mini" : ""}`}>
            
            <div className="nav-content">me</div>
            <div className="nav-content">projects</div>
            <div className="nav-content">more</div>
        </div>
    );
}

export default Navigation;