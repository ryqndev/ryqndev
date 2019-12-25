import bobaWatchImage from '../../assets/boba_watch.png';
import webDevImage from '../../assets/webdev.jpeg';

const data = [
    {
        id: 'boba-watch',
        name: 'Boba Watch',
        type: 'Progressive Web App',
        year: 2018,
        image: bobaWatchImage
    }, 
    {
        id: 'intro-to-web-dev',
        name: 'Intro to Web Dev',
        type: 'Coding Tutorials',
        year: 2019,
        // image: 'https://bit.ly/2PMb0lW'
        image: webDevImage
    }
]
const total = data.length;

export {
    data,
    total
}