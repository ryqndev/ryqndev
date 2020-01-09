import React from 'react';
import Toggle from 'react-toggle';
import './Toggle.scss';

const toggle = ({cur, set}) => {
    return (
        <label className="t-w">
            <Toggle
                checked={cur}
                icons={false}
                onChange={set.bind(null, !cur)}
            />
        </label>
    );
}

export default toggle;