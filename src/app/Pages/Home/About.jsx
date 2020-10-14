import React from 'react';
import ResumePDF from '../../assets/resume.pdf';
import './About.scss';

const About = () => {
    return (
        <section>
            <div className="ps-w">
                <div className="ps-h">
                    <h2>About</h2>
                </div>
                <p className="resume-link">i'm a software engineer looking for work. see my <a href={ResumePDF} target="_blank" rel="noopener noreferrer">resume</a>.</p>
            </div>
        </section>
    )
}

export default About;