import React, {useState, useEffect} from 'react';
import './LearnRyqnDev.scss';
import Markdown from 'react-markdown';

const LearnRyqnDev = () => {
    const [content, setContent] = useState("");
    useEffect(() => {
        fetch('https://raw.githubusercontent.com/ryqndev/Intro-To-Web-Dev/master/readme.md')
        .then(res => {
            return res.text();
        }).then(res => {
            setContent(res);
        });
    }, [])
    return (
        <div>
            <Markdown source={content} className="learn-ryqn-dev-w"/>
        </div>
    )
}

export default LearnRyqnDev;
