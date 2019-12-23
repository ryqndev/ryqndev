import React, {useState} from 'react';
import Project from './Project';
import {data} from './data';
import './Projects.css';

const Projects = () => {

    return (
        <div className="projects-w">
            { data.map( e => <Project expand={false} key={e.id} {...e}  /> ) }
        </div>
    )
}

export default Projects;
