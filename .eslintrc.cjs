module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'unused-imports'],
  extends: ['prettier'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',
    
    // Basic ESLint rules
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    
    // Unused imports plugin
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
    'prefer-const': 'error',
    'no-var': 'error',
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    
    // TypeScript specific rules
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' }
    ],
    '@typescript-eslint/no-non-null-assertion': 'error',
  },
  env: {
    node: true,
    es2022: true,
  },
};
