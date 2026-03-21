import config from '@antfu/eslint-config'

export default config(
  {
    jsonc: false,
    markdown: false,
    pnpm: false,
    stylistic: false,
    yaml: false,
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.tsbuildinfo',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
      'docs/public/assets/**'
    ],
    typescript: {
      overrides: {
        'antfu/no-import-dist': 'off',
        'array-callback-return': 'off',
        'import/consistent-type-specifier-style': 'off',
        'no-extra-boolean-cast': 'off',
        'no-new-func': 'off',
        'no-useless-return': 'off',
        'node/prefer-global/buffer': 'off',
        'node/prefer-global/process': 'off',
        'perfectionist/sort-named-exports': 'off',
        'regexp/no-useless-character-class': 'off',
        'regexp/no-useless-non-capturing-group': 'off',
        'ts/consistent-type-imports': 'off',
        'ts/no-empty-object-type': 'off',
        'ts/no-import-type-side-effects': 'off',
        'ts/no-namespace': 'off',
        'ts/no-redeclare': 'off',
        'ts/method-signature-style': 'off',
        'ts/ban-ts-comment': 'off',
        'ts/no-unsafe-function-type': 'off',
        'ts/no-use-before-define': 'off',
        'ts/no-wrapper-object-types': 'off',
        'unicorn/prefer-dom-node-text-content': 'off',
        'unicorn/prefer-type-error': 'off',
        'import/no-mutable-exports': 'off',
        'perfectionist/sort-imports': 'off',
        'perfectionist/sort-named-imports': 'off'
      }
    },
    javascript: {
      overrides: {
        'unused-imports/no-unused-vars': 'off'
      }
    },
    test: {
      overrides: {
        'test/consistent-test-it': 'off',
        'test/prefer-lowercase-title': 'off'
      }
    }
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,tsx,vue}'],
    rules: {
      'antfu/no-import-dist': 'off',
      'import/consistent-type-specifier-style': 'off',
      'node/prefer-global/buffer': 'off',
      'node/prefer-global/process': 'off',
      'perfectionist/sort-imports': 'off',
      'regexp/no-useless-character-class': 'off',
      'regexp/no-useless-non-capturing-group': 'off',
      'unused-imports/no-unused-imports': 'off'
    }
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/html-indent': 'off',
      'vue/html-self-closing': 'off',
      'vue/singleline-html-element-content-newline': 'off'
    }
  },
  {
    files: [
      '**/test/**/*.{js,mjs,cjs,ts,mts,cts,tsx}',
      'scripts/**/*.{js,mjs,cjs,ts,mts,cts}',
      'eslint.config.mjs',
      'vitest.config.ts'
    ],
    rules: {
      'no-console': 'off',
      'ts/strict-boolean-expressions': 'off'
    }
  }
)
