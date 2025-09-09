import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import filenames from 'eslint-plugin-filename-rules';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.FlatConfig[]}
 */
export const baseConfig = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      filenames,
      'check-file': checkFile,
      import: importPlugin,
    },
    rules: {
      // TS: evitar duplicados con regla base
      // Error si hay variables TypeScript no utilizadas, pero permitir las que empiecen con _
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Desactivar la regla base de no-unused-vars para evitar conflictos
      'no-unused-vars': 'off',

      // En producción: error si hay console.log, en desarrollo: advertencia
      'no-console': 'warn',

      // No permitir el uso de 'any' - usar tipos específicos en su lugar
      '@typescript-eslint/no-explicit-any': 'error',

      // Convenciones de nomenclatura para diferentes tipos de elementos
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'], // Variables: camelCase, MAYÚSCULAS, o PascalCase
          leadingUnderscore: 'allow', // Permitir guión bajo al inicio
          trailingUnderscore: 'allow', // Permitir guión bajo al final
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'], // Funciones: camelCase o PascalCase
        },
        {
          selector: 'parameter',
          format: ['camelCase'], // Parámetros: solo camelCase
          leadingUnderscore: 'allow', // Permitir guión bajo al inicio
        },
      ],

      // Convención para nombres de carpetas: CAMEL_CASE
      'check-file/folder-naming-convention': [
        'error',
        {
          '**/!(__tests__)/!(__mocks__)/': 'CAMEL_CASE',
        },
      ],

      // Ordenamiento de importaciones
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Node.js built-in modules
            'external', // Paquetes de npm
            'internal', // Archivos internos del proyecto
            'parent', // Importaciones desde el directorio padre
            'sibling', // Importaciones desde el mismo directorio
            'index', // Importaciones desde el archivo index
            'object', // Importaciones de objetos
            'type', // Importaciones de tipos
          ],
          pathGroups: [
            {
              pattern: 'core/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@repo/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },

  // Ignorar archivos generados automáticamente
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      'coverage/**',
      'public/**',
      // Archivos de declaración de tipos TypeScript
      '**/*.d.ts',
      // Archivos de configuración que no necesitan linting
      '**/vitest.config.{js,ts}',
      '**/vite.config.{js,ts}',
      '**/next.config.{js,ts}',
      '**/astro.config.{js,ts}',
      '**/tailwind.config.{js,ts}',
      '**/postcss.config.{js,ts}',
      '**/eslint.config.{js,ts}',
      '**/.stylelintrc.{js,ts}',
      // Archivos de configuración adicionales
      '**/jest.config.{js,ts}',
      '**/.lintstagedrc.{js,ts}',
      '**/.eslintrc.{js,ts}',
      '**/.prettierrc.{js,ts}',
      '**/tsconfig.json',
      '**/package.json',
      '**/bunfig.toml',
      '**/turbo.json',
      '**/nx.json',
    ],
  },
];

// Exportar la configuración principal para ESLint
export default baseConfig;
