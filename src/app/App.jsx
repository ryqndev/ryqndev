import { useState, useEffect } from 'react';
import {
	Routes,
	Route,
	useLocation,
} from 'react-router-dom';
import Toggle from 'react-toggle';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import Home from './pages/Home';
import BobaWatch from './pages/BobaWatch';
import Redirect from './pages/Redirect';
import { getTheme, setTheme as updateTheme } from './controller/theme';
import './styles/main.scss';

const App = () => {
	const [theme, setTheme] = useState(getTheme());
	const location = useLocation();

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
			<TransitionGroup>
				<CSSTransition
					key={location.key}
					classNames='fade-quick'
					timeout={500}
				>
					<Routes>
						<Route path='/' element={<Home />} exact />
                        <Route path='/pick-ban-pro' element={<Redirect to='https://pickban.pro/'/>} />
						<Route path='/boba-watch' element={<BobaWatch />} />
						<Route path='/learn-ryqn-dev' element={<Redirect to='https://learn.ryqn.dev/'/>} />
					</Routes>
				</CSSTransition>
			</TransitionGroup>
		</>
	);
};

export default App;
