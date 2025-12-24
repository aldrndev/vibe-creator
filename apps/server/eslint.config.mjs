import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['dist/', 'node_modules/', 'uploads/', 'temp/', 'output/', '*.config.mjs'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // Enable typed linting
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Digitesia Standard v3.3
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      
      // Disable base rule - use TypeScript version only
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      
      '@typescript-eslint/no-deprecated': 'error',
      
      // Common rules
      'no-undef': 'off', // TypeScript handles this
    },
  },
];
