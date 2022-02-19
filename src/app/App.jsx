import { memo, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Toggle from 'react-toggle';
import { Home, BobaWatch } from './pages';
import { useTheme } from './controller';
import LoadingSplash from './components/LoadingSplash';
import Footer from '@ryqndev/footer';
import './styles/main.scss';

const App = () => {
	const { theme, toggle } = useTheme();

	return (
		<>
			<Toggle
				className='t-w'
				checked={!!theme}
				icons={false}
				onChange={toggle}
			/>
			<LoadingSplash>
				<Suspense>
					<Routes>
						<Route path='/' element={<Home theme={theme} />} exact />
						<Route path='boba-watch' element={<BobaWatch />} />
						{/* <Route path='pick-ban-pro' element={<PickBanPro />} />
					<Route path='boba-watch' element={<BobaWatch />} />
					<Route
						path='learn-ryqn-dev'
						element={<Redirect to='https://learn.ryqn.dev/' />}
					/> */}
					</Routes>
				</Suspense>
			</LoadingSplash>
			<Footer />
		</>
	);
};

export default memo(App);
