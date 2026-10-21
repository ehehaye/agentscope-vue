/**
 * Jest 单测配置（Vue 2.6 + @vue/composition-api）。
 *
 * 不依赖 @vue/cli-plugin-unit-jest（其内置 jest 24 无法在 Node 24 上运行）：
 * 直接使用 jest 29 + @vue/vue2-jest，JS 由 babel-jest 复用根目录 babel.config.js
 * （@vue/babel-preset-app 在 NODE_ENV=test 时会自动切到 node target 并转 CJS）。
 */
module.exports = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.vue$': '@vue/vue2-jest',
    '^.+\\.js$': 'babel-jest',
  },
  // 与 vue.config.js 的 resolve.alias 对齐
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // remend 是 ESM-only 包（exports 仅声明 import 条件），jest 默认解析不到，
    // 显式指向产物并放开下方 transformIgnorePatterns 让其经 babel 转 CJS。
    '^remend$': '<rootDir>/node_modules/remend/dist/index.js',
  },
  testMatch: ['<rootDir>/tests/unit/**/*.spec.js'],
  // 与 vue.config.js 保持一致：用 babel 编译模板，支持 ?. 等新语法
  globals: {
    'vue-jest': {
      templateCompiler: {
        compiler: require('vue-template-babel-compiler'),
      },
    },
  },
  // 默认忽略 node_modules，但 ESM-only 的 remend 需转译
  // （pnpm 下真实路径形如 node_modules/.pnpm/remend@x/node_modules/remend/...）
  transformIgnorePatterns: ['/node_modules/(?!(?:\\.pnpm/)?(?:remend|marked))'],
  clearMocks: true,
};
