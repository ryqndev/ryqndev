import './styles/main.scss';

import { GameCanvas, Hud, Overlay, Shipyard } from '@ryqndev/brinewake-ui';
import { memo } from 'react';

// `?dev` on the dev server exposes the scripting handle used for automated playtests
const QUERY = new URLSearchParams(window.location.search);
const DEBUG = import.meta.env.DEV && QUERY.has('dev');
// `?drydock` opens straight into the shipyard's own mode, for working on a build without sailing for it
const DRYDOCK = QUERY.has('drydock');
// `?local` on the dev server makes crews up between tabs of this browser, without the internet in the way
const LOCAL_CREWS = import.meta.env.DEV && QUERY.has('local');

export const App = memo(() => {
    return (
        <>
            <GameCanvas debug={DEBUG} drydock={DRYDOCK} localCrews={LOCAL_CREWS} />
            <Hud />
            <Shipyard />
            <Overlay />
        </>
    );
});
