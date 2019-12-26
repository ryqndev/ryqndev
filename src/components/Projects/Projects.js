import React, {useEffect, useState, useRef} from 'react';
import Project from './Project';
import fse from './fse';
import {data} from './data';
import ReactMarkdown from 'react-markdown';
import './Projects.css';

const Projects = () => {
    const psRef = useRef(null);
    let contents = [];
    const [markdown, setMarkdown] = useState("");
    const display = (index) => {
        setMarkdown(contents[index]);
    }
    useEffect(() => {
        fse.load(display);
        data.forEach((e, i) => {
            fetch(e.content)
            .then((res) => res.text())
            .then((text) => {
                contents[i] = text;
            });
            });
    }, []);
    useEffect(() => {
        const scrollListener = psRef.current;
        scrollListener.addEventListener('wheel', scroll);
        return () => {
            scrollListener.removeEventListener('wheel', scroll);
        }
    }, [psRef]);
    let scroll = (e, v) => {
        // console.log(e.deltaY);
    }

    return (
        <div>
            <div key="ps-c" id="ps-c" onClick={fse.toggle} ref={psRef}>
                <div id="ps-p-description">
                    <ReactMarkdown source={markdown} />
                </div>
            </div>
            Projects
            <div key="ps-w" id="ps-w">
                { data.map( e => <Project expand={false} key={e.id} {...e}  /> ) }
            </div>
        </div>
    )
}

export default Projects;
