import React from 'react';
import Project from './Project';
import './Projects.scss';

import bobaWatchImage from '../../assets/images/boba_watch.png';
import webDevImage from '../../assets/images/webdev.jpeg';

const data = [
    {
        id: 'boba-watch',
        name: 'Boba Watch',
        type: 'Progressive Web App',
        year: 2018,
        image: bobaWatchImage,
    }, 
    {
        id: 'learn-ryqn-dev',
        name: 'learn.ryqn.dev',
        type: 'Coding Tutorials',
        year: 2019,
        image: webDevImage,
    }
];

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
