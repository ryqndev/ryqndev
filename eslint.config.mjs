import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import stylelintConfig from 'eslint-config-stylelint';
import ReactThree from '@react-three/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        rules: {
            'no-restricted-globals': [
                'error',
                {
                    name: 'close',
                    message: 'Use window.close if the global is wanted',
                },
            ],
            'import/no-default-export': 'error',
            'react/jsx-sort-props': ['error', { callbacksLast: true }],
            'no-else-return': 'error',
        },
        plugins: {
            '@react-three': ReactThree,
        },
    },
    ...stylelintConfig,
];
