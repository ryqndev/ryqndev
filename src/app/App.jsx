import { memo, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Toggle from 'react-toggle';
import { useTheme } from './controller';
import { LoadingSplash, CustomMouseCursor } from './components';
import cn from './App.module.scss';
import './styles/main.scss';

import Home from './pages/Home';

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
								exact
							/>
						</Routes>
					</Suspense>
				</>
			</LoadingSplash>

			<footer
				style={{
					height: '100vh',
					width: '100vw',
					backgroundColor: 'var(--background-emphasis)',
					position: 'relative',
					display: 'grid',
					placeContent: 'center',
					zIndex: 1000,
				}}
			>
				<p
					style={{
						fontWeight: 'bold',
						fontSize: 'min(10vw, 100px)',
						color: 'var(--background-color)',
					}}
				>
					RYAN YANG
				</p>
			</footer>
			{/* <Footer /> */}
		</>
	);
};

export default memo(App);
