import { memo, useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { useProgress } from '@react-three/drei';
import clsx from 'clsx';
import cn from './LoadingSplash.module.scss';

const LoadingSplash = ({ className, children }) => {
	const { progress } = useProgress();
	const [close, setClose] = useState(false);
	const location = useLocation();

	useEffect(() => {
		setClose(true);
		// if (location.pathname === '/') return;
		setTimeout(() => {
			setClose(true);
		}, 2000);
	}, [location]);

	// useEffect(() => {
	// 	if (progress < 100 || close) return;
	// 	setTimeout(() => {
	// 		setClose(true);
	// 	}, 2000);
	// }, [progress, close]);

	return (
		<>
			<div className={clsx(cn.container, close && cn.close)}></div>
			<div className={clsx(cn.container, close && cn.close)}></div>
			<div className={clsx(cn.container, close && cn.close)}>
				<div className={cn.content}>
					{/* <h2>{progress}%</h2> */}
				</div>
			</div>
			<div className={clsx(className)}>{children}</div>
		</>
	);
};
export default memo(LoadingSplash);
