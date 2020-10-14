import {useState, useEffect, useRef} from 'react';

const useScroll = () => {
    const [scroll, setScroll] = useState(0);
    const site = useRef();

    useEffect(() => {
        let siteRef = site.current;
        let updateScroll = () => {setScroll(site.current.scrollTop)}

        updateScroll();
        siteRef.addEventListener('scroll', updateScroll);

        return () => {
            siteRef.removeEventListener('scroll', updateScroll);
        }
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty('--scroll-small', scroll / 300);
        document.documentElement.style.setProperty('--scroll-big', scroll / -20 + 'deg');
    }, [scroll]);

    return site;

}

export default useScroll;