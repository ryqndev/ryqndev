import { lazily } from 'react-lazily';
import { memo, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import './styles/main.scss';

import { CustomMouseCursor } from './components/CustomMouseCursor/CustomMouseCursor';
import { LoadingSplash } from './components/LoadingSplash/LoadingSplash';
import { ThemeToggleSwitch } from '@components/ThemeToggleSwitch/ThemeToggleSwitch';

const { Test } = lazily(() => import('@pages/Test/Test'));
const { Home } = lazily(() => import('@pages/Home/Home'));

export const App = memo(function App() {
    return (
        <>
            <ThemeToggleSwitch />
            <CustomMouseCursor />
            <LoadingSplash>
                <Suspense fallback={<div>loading...</div>}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/test" element={<Test />} />
                    </Routes>
                </Suspense>
            </LoadingSplash>
        </>
    );
});
