import './styles/main.scss';

import { CustomMouseCursor } from '@ryqndev/components';
import { LoadingSplash } from '@ryqndev/loading';
import { ThemeToggleSwitch } from '@ryqndev/theme';
import { memo, Suspense } from 'react';
import { lazily } from 'react-lazily';
import { Route, Routes } from 'react-router';

const { Home } = lazily(() => import('@ryqndev/home'));
const { Scuba } = lazily(() => import('@ryqndev/scuba'));

export const App = memo(() => {
    return (
        <>
            <ThemeToggleSwitch />
            <CustomMouseCursor />
            <LoadingSplash>
                <Suspense fallback={<div>loading...</div>}>
                    <Routes>
                        <Route element={<Home />} path="/" />
                        <Route element={<Scuba />} path="/scuba" />
                    </Routes>
                </Suspense>
            </LoadingSplash>
        </>
    );
});
