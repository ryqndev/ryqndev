import React, { useState, useEffect, memo, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Toggle from 'react-toggle';
import Footer from '@ryqndev/footer';
import { Home, BobaWatch, Redirect, PickBanPro } from './pages';
import { getTheme, setTheme as updateTheme } from './controller/theme';
import LoadingSplash from './components/LoadingSplash';
import './styles/main.scss';

const App = () => {
	const [theme, setTheme] = useState(getTheme());

	useEffect(() => {
		updateTheme(theme);
	}, [theme]);

	return (
		<>
			<Toggle
				className='t-w'
				checked={!!theme}
				icons={false}
				onChange={() => {
					setTheme(+!theme);
				}}
			/>
			<LoadingSplash>
				<Suspense>
				<Routes>
					
					<Route path='/' element={<Home />} exact />
					<Route path='pick-ban-pro' element={<PickBanPro />} />
					<Route path='boba-watch' element={<BobaWatch />} />
					<Route
						path='learn-ryqn-dev'
						element={<Redirect to='https://learn.ryqn.dev/' />}
					/>
				</Routes>
				</Suspense>
			</LoadingSplash>
			<Footer />
		</>
	);
};

export default memo(App);
