import React, {useEffect, useState} from 'react';
import Project from './Project';
import fse from './fse';
import {data} from './data';
// import ReactMarkdown from 'react-markdown';
import './Projects.css';

const Projects = () => {
    useEffect(() => { fse.load() }, []);
    const [markdown, setMarkdown] = useState("Yellup");
    // fetch(`https://raw.githubusercontent.com/ryqndev/Intro-To-Web-Dev/master/readme.md`)
    // .then((response) => response.text())
    // .then((text) => {
    //     setMarkdown(text);
    // })
    return (
        <div>
            <div key="ps-c" id="ps-c" onClick={fse.toggle}>
                <div id="ps-p-description">
                    {markdown}
                </div>
            </div>
            <div key="ps-w" id="ps-w">
                { data.map( e => <Project expand={false} key={e.id} {...e}  /> ) }
            </div>
        </div>
    )
}

export default Projects;
