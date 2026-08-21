import angularPlugin from '@angular-eslint/eslint-plugin';
import templatePlugin from '@angular-eslint/eslint-plugin-template';
import templateParser from '@angular-eslint/template-parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    {
        ignores: ['dist/**', 'node_modules/**']
    },
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: typescriptParser
        },
        plugins: {
            '@angular-eslint': angularPlugin,
            '@typescript-eslint': typescriptPlugin
        },
        rules: {
            ...typescriptPlugin.configs.recommended.rules,
            ...angularPlugin.configs.recommended.rules,
            '@angular-eslint/component-selector': [
                'error',
                {type: 'element', prefix: 'app', style: 'kebab-case'}
            ],
            '@angular-eslint/directive-selector': [
                'error',
                {type: 'attribute', prefix: 'app', style: 'camelCase'}
            ]
        }
    },
    {
        files: ['src/**/*.html'],
        languageOptions: {
            parser: templateParser
        },
        plugins: {
            '@angular-eslint/template': templatePlugin
        },
        rules: {
            ...templatePlugin.configs.recommended.rules
        }
    }
];
