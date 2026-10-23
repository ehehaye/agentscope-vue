const path = require('path');
const { codeInspectorPlugin } = require('code-inspector-plugin');

// 部署到子路径（如 GitHub Pages 的 /<repo>/）时用 VUE_APP_PUBLIC_PATH 覆盖；
// 发布产物需与 src/router/index.js 的 base 保持同值。
const publicPath = process.env.VUE_APP_PUBLIC_PATH || (process.env.NODE_ENV === 'production' ? './' : '/');

// 开关取自 .env.production / .env.development：生产构建走 BootCDN，
// development 始终 false（本地打包，离线可开发）；生产构建前改为 false 可退回全量本地打包（内网/离线部署场景）。
const useCdn = process.env.VUE_APP_USE_CDN === 'true';

// BootCDN 引入清单。key 为 webpack externals 的模块名（含子路径），value 为全局变量名。
// 注意：element-ui 的 UMD 依赖 window.Vue，故 vue 必须一并 CDN 化且先于它加载。
// lodash 本地为 4.18.1，BootCDN 最高仅 4.17.21（4.x API 冻结，兼容）。
const CDN_PACKAGES = [
  { module: 'vue', global: 'Vue', js: 'https://cdn.bootcdn.net/ajax/libs/vue/2.6.14/vue.min.js' },
  {
    module: 'element-ui',
    global: 'ELEMENT',
    js: 'https://cdn.bootcdn.net/ajax/libs/element-ui/2.15.14/index.min.js',
    css: 'https://cdn.bootcdn.net/ajax/libs/element-ui/2.15.14/theme-chalk/index.min.css',
  },
  { module: 'echarts', global: 'echarts', js: 'https://cdn.bootcdn.net/ajax/libs/echarts/6.1.0/echarts.min.js' },
  { module: 'lodash', global: '_', js: 'https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.min.js' },
  {
    module: 'highlight.js/lib/common',
    global: 'hljs',
    js: 'https://cdn.bootcdn.net/ajax/libs/highlight.js/11.12.0/highlight.min.js',
  },
  { module: 'dompurify', global: 'DOMPurify', js: 'https://cdn.bootcdn.net/ajax/libs/dompurify/3.4.15/purify.min.js' },
];

const cdnExternals = useCdn
  ? CDN_PACKAGES.reduce((acc, pkg) => {
      acc[pkg.module] = pkg.global;
      return acc;
    }, {})
  : {};

module.exports = {
  publicPath,
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: false,
  // 仅转译发布为 ES2020+/ESM 的依赖（webpack 4 默认不转译 node_modules）。
  // 白名单来自 2026-09-07 实测：关闭全量转译后只有这 4 个包触发 module parse 失败，
  // 其余依赖（element-ui/date-fns/dompurify/remend/@iconify/vue2 等）均为 webpack 4 可解析产物。
  transpileDependencies: ['@agentscope-ai/agentscope', 'cron-parser', 'marked', 'mime-types'],
  devServer: {
    port: 5173,
    host: '0.0.0.0',
  },
  chainWebpack(config) {
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap((options) => {
        // 为 2.6.14 版本的 Vue 编译器启用 ?. 语法
        options.compiler = require('vue-template-babel-compiler');
        return options;
      });

    // 向 index.html 模板注入 CDN script/link 标签
    config.plugin('html').tap((args) => {
      args[0].useCdn = useCdn;
      args[0].cdnScripts = CDN_PACKAGES.map((pkg) => pkg.js);
      args[0].cdnStyles = CDN_PACKAGES.map((pkg) => pkg.css).filter(Boolean);
      return args;
    });
  },
  configureWebpack: {
    externals: cdnExternals,
    plugins: [
      codeInspectorPlugin({
        bundler: 'webpack',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // webpack 4 不支持 package.json 的 exports 字段，手动映射子路径导出
        '@agentscope-ai/agentscope/event': path.resolve(
          __dirname,
          'node_modules/@agentscope-ai/agentscope/dist/event/index.js',
        ),
        '@agentscope-ai/agentscope/message': path.resolve(
          __dirname,
          'node_modules/@agentscope-ai/agentscope/dist/message/index.js',
        ),
        // htmlparser2 的 ESM 构建含 webpack 4 不支持的 `export * as`，强制走 CommonJS 入口
        htmlparser2: path.resolve(__dirname, 'node_modules/htmlparser2/lib/index.js'),
      },
    },
  },
  css: {
    loaderOptions: {
      less: {
        additionalData: '@import "~@/styles/variables.less";',
      },
    },
  },
};
