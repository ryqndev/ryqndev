import { useEffect, useState } from 'react';

const useScroll = () => {
	const [y, setY] = useState(window?.scrollX);
	const listener = e => {
		setY(e.target.scrollingElement.scrollTop);
	};
	
	useEffect(() => {
		window.addEventListener('scroll', listener);
		return () => {
			window.removeEventListener('scroll', listener);
		};
	});

	return {
		y,
	};
};

export default useScroll;
