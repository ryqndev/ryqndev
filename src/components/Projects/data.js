import React from 'react';
import BobaWatch from '../BobaWatch';
import bobaWatchImage from '../../assets/images/boba_watch.png';
import webDevImage from '../../assets/images/webdev.jpeg';

const data = [
    {
        id: 'boba-watch',
        name: 'Boba Watch',
        type: 'Progressive Web App',
        year: 2018,
        image: bobaWatchImage,
        content: <BobaWatch />,

    }, 
    {
        id: 'intro-to-web-dev',
        name: 'Intro to Web Dev',
        type: 'Coding Tutorials',
        year: 2019,
        image: webDevImage,
        content: <div />
    }
]
const total = data.length;

export {
    data,
    total
}