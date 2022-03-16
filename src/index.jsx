import Plausible from 'plausible-tracker';
import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './app';
import * as serviceWorker from './serviceWorker';
import './i18n';

Plausible({
	domain: 'ryqn.dev',
});

render(
	<React.StrictMode>
		<Router basename={process.env.PUBLIC_URL}>
			<App />
		</Router>
	</React.StrictMode>,
	document.getElementById('root')
);

serviceWorker.unregister();
