import js from '@eslint/js'
import prettier from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        console: 'readonly',
        Promise: 'readonly',
        Date: 'readonly',
        Math: 'readonly',
        URLSearchParams: 'readonly',
        String: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/'],
  },
]
