import React, {useEffect, useState, useRef} from 'react';
import Project from './Project';
// import fse from './fse';
import {data} from './data';
import './Projects.scss';

const Projects = () => {
    return (
        <section>
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
