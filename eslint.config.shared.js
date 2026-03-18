import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Shared ESLint configuration for OmniLink APEX projects
 * This eliminates duplication across multiple apps
 */
export const createEslintConfig = (options = {}) => {
  const { ignores = ['dist', 'node_modules'] } = options;

  return tseslint.config(
    { ignores },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        ecmaVersion: 2020,
      },
      plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_' },
        ],
      },
    },
    {
      files: ['apps/omnihub-site/src/pages/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            { group: ['*/src/core/*', '**/core/**'], message: 'Pages must not import from src/core/. Use src/adapters/ instead.' },
            { group: ['*/stores/*', '**/stores/**'], message: 'Pages must not import stores directly. Use src/adapters/toOmniDashUI().' },
          ],
        }],
      },
    },
    {
      files: ['src/core/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['*/pages/*', '**/pages/**', '*/components/*', '**/components/**'],
              message: 'Core must not import from UI layers. Flow: core → adapters → UI.',
            },
          ],
        }],
      },
    }

  );
};
