import { memo } from 'react';
import cn from './ScrollableNotice.module.scss';

export const ScrollableNotice = memo(function ScrollableNotice() {
    return (
        <div
            className={cn.container}
        >
            <div className={cn.mouse}>
                <div className={cn.wheel}></div>
            </div>
        </div>
    );
});
