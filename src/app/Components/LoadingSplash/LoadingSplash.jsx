import { memo, useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import clsx from 'clsx';
import cn from './LoadingSplash.module.sass';


const LoadingSplash = ({className, children}) => {
    const [close, setClose] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setClose(false);
        setTimeout(() => {
            setClose(true);
        }, 2000);
    }, [location]);

	return (
		<>
			<div className={clsx(cn.wrapper, close && cn.close)}></div>
			<div className={clsx(cn.wrapper, close && cn.close)}></div>
			<div className={clsx(cn.wrapper, close && cn.close)}></div>
			<div className={clsx(className)}>
                {children}
            </div>
		</>
	);
};
export default memo(LoadingSplash);
