import Plausible from 'plausible-tracker';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { App } from './app/App';
import './i18n/i18n';

console.log('v.3.1.0');

Plausible({
    domain: 'ryqn.dev',
});

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
    <Router basename={import.meta.env.BASE_URL}>
        <App />
    </Router>
);
