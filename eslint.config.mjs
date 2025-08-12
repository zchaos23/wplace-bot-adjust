// @ts-check
import skyEslintConfig from '@softsky/configs/eslint.config.mjs';

/** @type {import("typescript-eslint").Config} */
export default [
  ...skyEslintConfig,
  {
    rules: {
      'import-x/prefer-default-export': 0,
      '@typescript-eslint/no-dynamic-delete': 0,
      'unicorn/no-array-method-this-argument': 0,
      'unicorn/no-array-callback-reference': 0,
      'unicorn/prefer-modern-math-apis': 0, // Bruh, "modern" math apis are slow af
      'prefer-math-min-max': 0, // Tenary is faster
      'unicorn/prefer-code-point': 0,
      '@typescript-eslint/prefer-string-starts-ends-with': 0,
      'unicorn/no-new-array': 0
    }
  }
];