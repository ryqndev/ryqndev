import { useEffect } from 'react';

const useScroll = () => {

    useEffect(() => {
        let updateScroll = () => {
            document.documentElement.style.setProperty('--scroll-small', window.scrollY / 300);
            document.documentElement.style.setProperty('--scroll-big', window.scrollY / -20 + 'deg');
        }

        updateScroll();
        window.addEventListener('scroll', updateScroll);

        return () => {
            window.removeEventListener('scroll', updateScroll);
        }
    }, []);

}

export default useScroll;