import Plausible from 'plausible-tracker';
import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './app';
import * as serviceWorker from './serviceWorker';
import './i18n';

console.log('v.2.0.5');

Plausible({
	domain: 'ryqn.dev',
});

render(
	<Router basename={process.env.PUBLIC_URL}>
		<App />
	</Router>,
	document.getElementById('root')
);

serviceWorker.unregister();
