import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import unicorn from 'eslint-plugin-unicorn';
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
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
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
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { unicorn },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: ['variable', 'parameter'], format: ['camelCase'] },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE'],
        },
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: 'function',
          format: ['camelCase'],
          custom: {
            regex:
              '^(?:debounce|(?:get|set|create|fetch|search|map|parse|validate|assert|normalize|calculate|count|classify|format|render|update|clear|cancel|abort|handle|subscribe|unsubscribe|dispose|select|close|open|load|save|remove|add|delete|resolve|reject|respond|fail|run|is|has|can|should)[A-Z].*)$',
            match: true,
          },
        },
        {
          selector: ['variable', 'parameter', 'classProperty', 'typeProperty'],
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'has', 'can', 'should'],
        },
      ],
      'unicorn/name-replacements': [
        'error',
        {
          checkFilenames: false,
          checkProperties: false,
          checkShorthandProperties: false,
          replacements: {
            fn: { callback: true },
            val: { value: true },
            str: { text: true },
          },
        },
      ],
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
