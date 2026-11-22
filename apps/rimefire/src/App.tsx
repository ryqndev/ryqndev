import './styles/main.scss';

import { GameCanvas, Hud, Overlay } from '@ryqndev/rimefire-ui';
import { memo } from 'react';

// `?dev` on the dev server exposes the scripting handle used for automated playtests
const DEBUG = import.meta.env.DEV && new URLSearchParams(window.location.search).has('dev');

export const App = memo(() => {
    return (
        <>
            <GameCanvas debug={DEBUG} />
            <Hud />
            <Overlay />
        </>
    );
});
