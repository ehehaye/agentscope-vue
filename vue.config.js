const path = require('path');
const { codeInspectorPlugin } = require('code-inspector-plugin');

module.exports = {
  publicPath: process.env.NODE_ENV === "production" ? "./" : "/",
  outputDir: "dist",
  assetsDir: "static",
  lintOnSave: false,
  // 仅转译发布为 ES2020+/ESM 的依赖（webpack 4 默认不转译 node_modules）。
  // 白名单来自 2026-09-07 实测：关闭全量转译后只有这 4 个包触发 module parse 失败，
  // 其余依赖（element-ui/date-fns/dompurify/remend/@iconify/vue2 等）均为 webpack 4 可解析产物。
  transpileDependencies: [
    "@agentscope-ai/agentscope",
    "cron-parser",
    "marked",
    "mime-types",
  ],
  devServer: {
    port: 5173,
    host: "0.0.0.0",
  },
  configureWebpack: {
    plugins: [
      codeInspectorPlugin({
        bundler: "webpack",
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        // webpack 4 不支持 package.json 的 exports 字段，手动映射子路径导出
        "@agentscope-ai/agentscope/event": path.resolve(
          __dirname,
          "node_modules/@agentscope-ai/agentscope/dist/event/index.js",
        ),
        "@agentscope-ai/agentscope/message": path.resolve(
          __dirname,
          "node_modules/@agentscope-ai/agentscope/dist/message/index.js",
        ),
        // htmlparser2 的 ESM 构建含 webpack 4 不支持的 `export * as`，强制走 CommonJS 入口
        htmlparser2: path.resolve(
          __dirname,
          "node_modules/htmlparser2/lib/index.js",
        ),
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
