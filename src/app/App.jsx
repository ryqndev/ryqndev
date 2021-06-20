import { useState, useEffect, memo } from 'react';
import { Routes, Route } from 'react-router-dom';
import Toggle from 'react-toggle';
import { Home, BobaWatch, Redirect, PickBanPro } from './pages';
import Footer from './components/Footer';
import { getTheme, setTheme as updateTheme } from './controller/theme';
import './styles/main.scss';
import LoadingSplash from './components/LoadingSplash';

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
				<Routes>
					<Route path='/' element={<Home />} exact />
					<Route path='pick-ban-pro' element={<PickBanPro />} />
					<Route path='boba-watch' element={<BobaWatch />} />
					<Route
						path='learn-ryqn-dev'
						element={<Redirect to='https://learn.ryqn.dev/' />}
					/>
				</Routes>
			</LoadingSplash>
			<Footer />
		</>
	);
};

export default memo(App);
