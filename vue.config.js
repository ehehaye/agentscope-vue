const path = require('path');
const { codeInspectorPlugin } = require('code-inspector-plugin');
const WebpackCdnPlugin = require('webpack-cdn-plugin');

// 部署到子路径（如 GitHub Pages 的 /<repo>/）时用 VUE_APP_PUBLIC_PATH 覆盖；
// 发布产物需与 src/router/index.js 的 base 保持同值。
const publicPath = process.env.VUE_APP_PUBLIC_PATH || (process.env.NODE_ENV === 'production' ? './' : '/');

const useCdn = process.env.VUE_APP_USE_CDN === 'true';

const CDN_MODULES = [
  { name: 'vue', var: 'Vue', path: 'dist/vue.min.js' },
  {
    name: 'element-ui',
    var: 'ELEMENT',
    path: 'lib/index.js',
    style: 'lib/theme-chalk/index.css',
  },
  { name: 'echarts', var: 'echarts', path: 'dist/echarts.min.js' },
  { name: 'lodash', var: '_', path: 'lodash.min.js' },
  // highlight.js 的 npm 包只提供 CJS/ESM 构建，浏览器 UMD 由官方以同版本号发布在 @highlightjs/cdn-assets
  { name: 'highlight.js', cdn: '@highlightjs/cdn-assets', var: 'hljs', path: 'highlight.min.js' },
  { name: 'dompurify', var: 'DOMPurify', path: 'dist/purify.min.js' },
];

// 业务代码引用的是子路径 highlight.js/lib/common，而插件用 name 同时充当包名与 externals 键，
// 无法表达「模块 id ≠ 包名」，故单独补一条 externals；该包的版本与 URL 仍由上面的清单提供。
const cdnExternals = useCdn ? { 'highlight.js/lib/common': 'hljs' } : {};

// 开发代理。http-proxy 默认会在 onProxyRes 之后自行 pipe 上游响应，不给调用方留 flush 时机；
// 因此开启 selfHandleResponse 自己写响应头，再统一转发。
// （http-proxy-middleware 0.19 没有声明这个选项，但会把它原样透传给 http-proxy@1.18。）
const DEV_PROXY = {
  '/proxy': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: (url) => url.replace('/proxy', ''),
    selfHandleResponse: true,
    // 上游启用 gzip 时，SSE 的分块会被压缩流攒住，这里直接要求明文传输
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('Accept-Encoding', 'identity');
    },
    onProxyRes: (proxyRes, req, res) => {
      const contentType = proxyRes.headers['content-type'] || '';
      const isEventStream = contentType.includes('text/event-stream');

      const headers = { ...proxyRes.headers };
      if (isEventStream) {
        // 覆盖掉可能存在的缓存/缓冲语义，普通响应保持上游原样
        headers['Cache-Control'] = 'no-cache, no-transform';
        headers['X-Accel-Buffering'] = 'no';
      }

      res.writeHead(proxyRes.statusCode, headers);
      // SSE 长度未知，先把响应头发出去，浏览器才能立即进入流式读取
      if (isEventStream) res.flushHeaders();
      proxyRes.pipe(res);
    },
  },
};

module.exports = {
  publicPath,
  outputDir: 'dist',
  assetsDir: 'static',
  // 由 @vue/cli-plugin-eslint 处理：'warning' 让 lint 结果以 warning 输出；
  // 配合下面 eslint-loader 的 failOnError，error 级规则仍会中断构建。
  lintOnSave: 'warning',
  // 仅转译发布为 ES2020+/ESM 的依赖（webpack 4 默认不转译 node_modules）。
  // 白名单来自 2026-09-07 实测：关闭全量转译后只有这 4 个包触发 module parse 失败，
  // 其余依赖（element-ui/date-fns/dompurify/remend/@iconify/vue2 等）均为 webpack 4 可解析产物。
  transpileDependencies: ['@agentscope-ai/agentscope', 'cron-parser', 'marked', 'mime-types'],
  devServer: {
    port: 5173,
    host: '0.0.0.0',
    proxy: DEV_PROXY,
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

    // lintOnSave:'warning' 时 eslint-loader 把所有问题按 warning 输出；
    // 打开 failOnError 让 error 级规则仍然中断构建。
    if (config.module.rules.has('eslint')) {
      config.module
        .rule('eslint')
        .use('eslint-loader')
        .tap((options) => ({ ...options, failOnError: true }));
    }
  },
  configureWebpack: {
    externals: cdnExternals,
    plugins: [
      codeInspectorPlugin({
        bundler: 'webpack',
      }),
      // 仅在 CDN 构建时启用；development / 关闭 CDN 时依赖照常打进 bundle（离线可开发）。
      ...(useCdn
        ? [
            new WebpackCdnPlugin({
              prod: true,
              publicPath,
              pathToNodeModules: __dirname,
              prodUrl: 'https://registry.npmmirror.com/:name/:version/files/:path',
              modules: CDN_MODULES,
            }),
          ]
        : []),
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
        // docx 的 ESM 构建含 rolldown 的 `typeof require` 兼容分支，webpack 4 会报
        // Critical dependency，改用 CommonJS 构建（按需 import 时仍会单独分包）
        docx: path.resolve(__dirname, 'node_modules/docx/dist/index.cjs'),
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
