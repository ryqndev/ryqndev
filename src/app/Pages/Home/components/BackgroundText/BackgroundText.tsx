import clsx from 'clsx';
import cn from './BackgroundText.module.scss';

export function BackgroundText({ visible }: { visible: boolean }) {
    return (
        <div className={clsx(cn.container, visible && cn.visible)}>
            ryan
            <br />
            yang
        </div>
    );
}
