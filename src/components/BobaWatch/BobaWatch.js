import React, {useState, useEffect} from 'react';
import './BobaWatch.scss';
import Markdown from 'react-markdown';

const BobaWatch = () => {
    const [content, setContent] = useState('');
    useEffect(() => {
        fetch('https://raw.githubusercontent.com/ryqndev/boba-watch/master/README.md')
        .then(res => {
            return res.text();
        }).then(res => {
            setContent(res);
        });
    }, []);
    return (
        <div>
            <Markdown source={content} className="bwatch-w"/>
        </div>
    )
}

export default BobaWatch;
