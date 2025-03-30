// eslint.config.mjs

import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintPluginSecurity from 'eslint-plugin-security';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginTypescript from '@typescript-eslint/eslint-plugin';
import eslintParserTypescript from '@typescript-eslint/parser';
import eslintParserNext from '@next/eslint-plugin-next';

export default [
  {
    ignores: ['node_modules/', 'dist/', '.next/', 'out/', 'coverage/'], // Ignore build folders
  },

  {
    languageOptions: {
      parser: eslintParserTypescript,
      sourceType: 'module',
      ecmaVersion: 'latest',
    },

    plugins: {
      '@typescript-eslint': eslintPluginTypescript,
      import: eslintPluginImport,
      react: eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
      'jsx-a11y': eslintPluginJsxA11y,
      unicorn: eslintPluginUnicorn,
      security: eslintPluginSecurity,
      prettier: eslintPluginPrettier,
      '@next/next': eslintParserNext,
    },

    rules: {
      // ✅ TypeScript Rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'warn',

      // ✅ React Rules
      'react/jsx-filename-extension': ['warn', { extensions: ['.tsx'] }],
      'react/react-in-jsx-scope': 'off', // Next.js has React in scope automatically
      'react-hooks/rules-of-hooks': 'error', // Ensures hooks are used correctly
      'react-hooks/exhaustive-deps': 'warn', // Ensures dependencies are declared correctly

      // ✅ Import Sorting
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],

      // ✅ Accessibility
      'jsx-a11y/anchor-is-valid': 'off', // Next.js handles this differently
      'jsx-a11y/no-static-element-interactions': 'warn',

      // ✅ Unicorn (General JS best practices)
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-null': 'off',

      // ✅ Security
      'security/detect-object-injection': 'warn',

      // ✅ Prettier (Enforce code style)
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          semi: true,
          trailingComma: 'all',
          printWidth: 100,
          tabWidth: 2,
        },
      ],
    },

    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: true,
      },
    },
  },
];
