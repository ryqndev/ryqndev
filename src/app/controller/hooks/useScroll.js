import { useEffect } from 'react';

const useScroll = () => {

    useEffect(() => {
        let waiting = false, endScrollHandle;
        let updateScroll = () => {
            if (waiting) return;
            waiting = true;
        
            if(window.scrollY < window.innerHeight * 1.5) {
                document.documentElement.style.setProperty('--scroll-small', window.scrollY / 300);
                document.documentElement.style.setProperty('--scroll-big', window.scrollY / -20 + 'deg');
            }
        
            clearTimeout(endScrollHandle);

            setTimeout(function () {
                waiting = false;
            }, 15);

            endScrollHandle = setTimeout(() => {
                document.documentElement.style.setProperty('--scroll-small', window.scrollY / 300);
                document.documentElement.style.setProperty('--scroll-big', window.scrollY / -20 + 'deg');
            }, 300);

        }

        updateScroll();
        window.addEventListener('scroll', updateScroll);

        window.addEventListener('load', () => {
            document.documentElement.style.setProperty('--scroll-small', window.scrollY / 300);
            document.documentElement.style.setProperty('--scroll-big', window.scrollY / -20 + 'deg');
        });

        return () => window.removeEventListener('scroll', updateScroll);
    }, []);

}

export default useScroll;