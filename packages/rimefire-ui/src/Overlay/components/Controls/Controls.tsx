import { Fragment, memo } from 'react';

import cn from './Controls.module.scss';

const BINDINGS: [keys: string, action: string][] = [
    ['WASD', 'move'],
    ['MOUSE', 'aim'],
    ['LMB', 'fire'],
    ['Q / WHEEL / 1 2', 'swap gelcaster ⇄ striker'],
    ['SPACE', 'jump'],
    ['SHIFT', 'sprint'],
    ['G', 'graphics quality'],
    ['ESC', 'pause'],
];

export const Controls = memo(function Controls() {
    return (
        <div className={cn.controls}>
            {BINDINGS.map(([keys, action]) => (
                <Fragment key={keys}>
                    <kbd>{keys}</kbd>
                    <span>{action}</span>
                </Fragment>
            ))}
        </div>
    );
});
