import { memo, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Toggle from 'react-toggle';
import { useTheme } from './controller';
import { LoadingSplash, CustomMouseCursor } from './components';
import './styles/main.scss';
import Footer from '@ryqndev/footer';

import Home from './pages/Home';
import DigitalAudio from './pages/DigitalAudio';

const App = () => {
	const { theme, toggle } = useTheme();
	
	return (
		<>
			<div
				className='t-w'
				onClick={toggle}
				data-mouse-hover='button'
				data-mouse-hover-text='toggle theme'
			>
				<Toggle checked={!!theme} icons={false} onChange={toggle} />
			</div>
			<CustomMouseCursor />
			<LoadingSplash>
				<>
					<Suspense fallback={<div>loading...</div>}>
						<Routes>
							<Route
								path='/'
								element={<Home theme={theme} />}
							/>
							<Route
								path='/digital-audio'
								element={<DigitalAudio />}
							/>
						</Routes>
					</Suspense>
				</>
			</LoadingSplash>
			<Footer />
		</>
	);
};

export default memo(App);
