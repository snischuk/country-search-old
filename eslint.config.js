import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'error',
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/typedef': [
        'error',
        {
          variableDeclaration: true,
          parameter: true,
          arrowParameter: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'error',
    },
  },
  eslintConfigPrettier,
  {
    files: ['**/*.{js,ts}'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],
    },
  },
];
