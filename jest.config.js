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
  },
  testMatch: ['<rootDir>/tests/unit/**/*.spec.js'],
  transformIgnorePatterns: ['/node_modules/'],
  clearMocks: true,
};
