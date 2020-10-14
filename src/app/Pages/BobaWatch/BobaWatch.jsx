import React from 'react';
import BobaWatchSplashBannerImage from '../../assets/images/splash-min.png';
import {ScrollableNotice, Footer} from '../../Components';
import BackLink from '../../Components/BackLink/BackLink';
import useScroll from '../../controller/hooks/useScroll';
import './BobaWatch.scss';

const BobaWatch = () => {
    const site = useScroll();
    return (
        <article className="boba-watch--wrapper" ref={site}>
            <div style={{position: 'relative'}}><ScrollableNotice flipped/></div>
            <aside>
                <span>boba watch</span> - a case study
            </aside>
            <figure className="hero">
                <BackLink to="/" pageName="projects"/>
                <div className="bwatch--layers">
                    <div id="layer-1" className="bwatch-layer"></div>
                    <div id="layer-2" className="bwatch-layer"></div>
                    <div id="layer-3" className="bwatch-layer"></div>
                </div>
            </figure>
 
            <h1>boba watch</h1>

            <div className="description">
                I founded <span>Boba Watch</span> - a Progressive Web App that helps users keep track of and analyze their drink spending - in April of 2019.  Using a <span>React</span>/SASS/Firebase tech stack, I built the app from the ground up and designed the infrastructure currently in place to support high level production features such as <span>i18n</span> for thousands of users.
            </div>
            <div className="image-expand--holder">
                <img src={BobaWatchSplashBannerImage} alt="Boba Watch case study splash" className="splash" />
            </div>

            {/* <div className="">
                How a hackathon project turned into a global phenomena
            </div> */}
            <Footer />
        </article>
    )
}

export default BobaWatch;
