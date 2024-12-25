import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import stylelintConfig from 'eslint-config-stylelint';
import ReactThree from '@react-three/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

/** @type {import('eslint').Linter.Config[]} */
// eslint-disable-next-line
export default [
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    importPlugin.flatConfigs.recommended,
    pluginReact.configs.flat.recommended,
    ...stylelintConfig,
    {
        plugins: {
            '@react-three': ReactThree,
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            'no-restricted-globals': [
                'error',
                {
                    name: 'close',
                    message: 'Use window.close if the global is wanted',
                },
            ],
            'arrow-parents': ['off', 'always'],
            'import/no-default-export': 'error',
            'react/jsx-sort-props': ['error', { callbacksLast: true }],
            'no-else-return': 'error',
            'sort-imports': ['off', 'always'],
            'react/display-name': 'off',
            'react/jsx-wrap-multilines': [
                'error',
                {
                    declaration: 'parens-new-line',
                    assignment: 'parens-new-line',
                    return: 'parens-new-line',
                    arrow: 'parens-new-line',
                    condition: 'parens-new-line',
                    logical: 'parens-new-line',
                    prop: 'parens-new-line',
                },
            ],
            'react/react-in-jsx-scope': 'off',
            'react/no-unknown-property': ['off', { ignore: ['args'] }],
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
        },
    },
];
