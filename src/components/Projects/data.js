import bobaWatchImage from '../../assets/images/boba_watch.png';
import webDevImage from '../../assets/images/webdev.jpeg';

const data = [
    {
        id: 'boba-watch',
        name: 'Boba Watch',
        type: 'Progressive Web App',
        year: 2018,
        image: bobaWatchImage,
        content: 'https://raw.githubusercontent.com/ryqndev/boba-watch/master/README.md'
    }, 
    {
        id: 'intro-to-web-dev',
        name: 'Intro to Web Dev',
        type: 'Coding Tutorials',
        year: 2019,
        image: webDevImage,
        content: 'https://raw.githubusercontent.com/ryqndev/Intro-To-Web-Dev/master/readme.md'
    }
]
const total = data.length;

export {
    data,
    total
}