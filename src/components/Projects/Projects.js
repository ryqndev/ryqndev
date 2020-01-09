import React, {useEffect, useState, useRef} from 'react';
import Project from './Project';
import fse from './fse';
import {data} from './data';
import './Projects.scss';

const Projects = () => {
    const psRef = useRef(null);
    const display = (i) => {
        psRef.current.scrollTo({top: 0});
        setPID(i);
    }
    const close = (i) => { 
        psRef.current.scrollTo({top: 0, behavior: 'smooth'});
        psRef.current.children[0].style.top = 0;
    }
    const [pID, setPID] = useState(0);
    useEffect(() => { fse.load(display, close) }, []);
    useEffect(() => {
        const scrollListener = psRef.current;
        scrollListener.addEventListener('wheel', scroll);
        return () => {
            scrollListener.removeEventListener('wheel', scroll);
        }
    }, [psRef]);
    let scroll = () => {
        psRef.current.children[0].style.top = psRef.current.scrollTop * 0.8 + 'px';
    }

    return (
        <section>
            <div id="ps-c" onClick={fse.toggle} ref={psRef}>
                <article id="ps-p-description">
                    {data[pID].content}
                </article>
            </div>
            <div className="ps-w">
                <div className="ps-h">
                    <h2>Projects</h2>
                </div>
                <div id="ps-project">
                    { data.map( e => <Project expand={false} key={e.id} {...e}  /> ) }
                </div>
            </div>
        </section>
    )
}

export default Projects;
