import pluginJs from '@eslint/js';
import ReactThree from '@react-three/eslint-plugin';
import stylelintConfig from 'eslint-config-stylelint';
import importResolver from 'eslint-import-resolver-typescript';
import importPlugin from 'eslint-plugin-import';
import pluginReact from 'eslint-plugin-react';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
// eslint-disable-next-line
export default [
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    importPlugin.flatConfigs.recommended,
    pluginReact.configs.flat.recommended,
    importResolver.configs.flat.recommended,
    ...stylelintConfig,
    {
        settings: {
            'import/resolver': {
                typescript: {},
            },
        },
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
            'no-absolute-path': 'off',
            'arrow-parents': ['off', 'always'],
            'import/no-default-export': 'error',
            'react/jsx-sort-props': ['error', { callbacksLast: true }],
            'no-else-return': 'error',
            'sort-imports': ['off', 'always'],
            'react/display-name': 'off',
            'guard-for-in': 'off',

            // use the TS version
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error'],
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
