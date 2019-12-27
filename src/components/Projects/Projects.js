import React, {useEffect, useState, useRef} from 'react';
import Project from './Project';
import fse from './fse';
import {data} from './data';
import ReactMarkdown from 'react-markdown';
import './Projects.css';

const Projects = () => {
    const psRef = useRef(null);
    let contents = [];
    const display = (i) => {
        psRef.current.scrollTo({top: 0});
        setMarkdown(contents[i]);
    }
    const close = (i) => {
        psRef.current.scrollTo({top: 0, behavior: 'smooth'});
    }
    const [markdown, setMarkdown] = useState("");
    useEffect(() => {
        fse.load(display, close);
        data.forEach((e, i) => {
            fetch(e.content)
            .then((res) => res.text())
            .then((text) => {
                contents[i] = text;
            });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <section>
            <div id="ps-c" onClick={fse.toggle} ref={psRef}>
                <article id="ps-p-description">
                    <ReactMarkdown source={markdown} />
                </article>
            </div>
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
