module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    // ESLint 6 不支持 'latest'，代码最高只用到 ES2020（?. / ??）
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  // 只借用 vue-eslint-parser 解析 SFC 的 <script>，不启用任何 vue 风格/模板规则
  extends: ['plugin:vue/base'],
  rules: {
    // 仅检查未使用的变量/导入（含函数参数），不做任何样式约束
    'no-unused-vars': [
      'warn',
      {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
      },
    ],
  },
};
