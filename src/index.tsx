import Plausible from 'plausible-tracker';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app/App';
import './i18n/i18n';

console.log('v.4.0.0');

Plausible({
    domain: 'ryqn.dev',
});

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
    <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
    </BrowserRouter>
);
