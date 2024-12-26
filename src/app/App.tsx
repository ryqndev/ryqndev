import './styles/main.scss';

import { ThemeToggleSwitch } from '@components/ThemeToggleSwitch';
import { memo, Suspense } from 'react';
import { lazily } from 'react-lazily';
import { Route, Routes } from 'react-router';

import { CustomMouseCursor } from './components/CustomMouseCursor/CustomMouseCursor';
import { LoadingSplash } from './components/LoadingSplash/LoadingSplash';

const { Test } = lazily(() => import('@pages/Test/Test'));
const { Home } = lazily(() => import('@pages/Home/Home'));

export const App = memo(() => {
    return (
        <>
            <ThemeToggleSwitch />
            <CustomMouseCursor />
            <LoadingSplash>
                <Suspense fallback={<div>loading...</div>}>
                    <Routes>
                        <Route element={<Home />} path="/" />
                        <Route element={<Test />} path="/test" />
                    </Routes>
                </Suspense>
            </LoadingSplash>
        </>
    );
});
