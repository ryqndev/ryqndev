import { Fragment, memo } from 'react';

import cn from './Controls.module.scss';

export type Binding = [keys: string, action: string];

interface ControlsProps {
    bindings: readonly Binding[];
}

/** The key bindings, as a two-column list for the menu screens. */
export const Controls = memo(function Controls({ bindings }: ControlsProps) {
    return (
        <div className={cn.controls}>
            {bindings.map(([keys, action]) => (
                <Fragment key={keys}>
                    <kbd>{keys}</kbd>
                    <span>{action}</span>
                </Fragment>
            ))}
        </div>
    );
});
