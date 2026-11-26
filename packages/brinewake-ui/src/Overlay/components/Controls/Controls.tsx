import { Fragment, memo } from 'react';

import cn from './Controls.module.scss';

const BINDINGS: [keys: string, action: string][] = [
    ['W / S', 'set or take in sail'],
    ['A / D', 'helm to port, starboard'],
    ['MOUSE', 'look · lay the guns on that side'],
    ['LMB', 'fire the broadside'],
    ['RMB', 'spyglass'],
    ['F', 'drop anchor at port'],
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
