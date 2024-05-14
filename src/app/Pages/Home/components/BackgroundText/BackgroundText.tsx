import clsx from 'clsx';
import cn from './BackgroundText.module.scss';
import { memo } from 'react';

export const BackgroundText = memo(function BackgroundText({
    visible,
}: {
    visible: boolean;
}) {
    return (
        <div className={clsx(cn.container, visible && cn.visible)}>
            ryan
            <br />
            yang
        </div>
    );
});
