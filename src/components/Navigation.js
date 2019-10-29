import React, {useState} from 'react';
import './styles/Navigation.css';
import '../assets/libraries/hamburgers.css';

  
const Navigation = ({scroll}) => {
    const [opened, toggleMenu] = useState(false);
    let toggle = () => {
        toggleMenu(!opened);
    }
    return (
        <div className={`nav-wrapper ${scroll ? "mini" : ""} ${opened ? "open" : ""}`}>
            <button
                className={`hamburger hamburger--stand ${opened ? "is-active" : ""}`}
                type="button"
                aria-label="Menu"
                aria-controls="navigation"
                onClick={toggle}
            >
                <span className="hamburger-box">
                    <span className={`hamburger-inner ${opened ? "open" : ""}`}></span>
                </span>
            </button> 
            <div className={`nav-content ${opened ? "open" : ""}`}>
                <div className="nav-content--holder">
                    <span>Projects:</span>
                    <br />
                    <a href="https://info.boba.watch" target="_blank" rel="noopener noreferrer">boba watch</a>
                </div>
            </div>
        </div>
    );
}

export default Navigation;