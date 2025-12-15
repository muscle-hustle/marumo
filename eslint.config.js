import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            'react/jsx-no-target-blank': 'off',
            'react/react-in-jsx-scope': 'off', // React 17+では不要
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            '@typescript-eslint/no-unused-vars': [
                'warn', // 警告に変更（未使用変数は警告のみ）
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn', // anyを許可（警告のみ）
            '@typescript-eslint/ban-ts-comment': 'warn', // ts-ignoreを許可（警告のみ）
            'react-hooks/set-state-in-effect': 'warn', // 警告のみ
            'react-hooks/exhaustive-deps': 'warn', // 警告のみ
            'react-hooks/preserve-manual-memoization': 'off', // React Compilerの警告は無視
            'prefer-const': 'warn', // 警告のみ
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
)

