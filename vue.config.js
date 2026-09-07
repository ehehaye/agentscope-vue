const path = require('path');

module.exports = {
	publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
	outputDir: 'dist',
	assetsDir: 'static',
	lintOnSave: false,
	// 大量依赖发布为 ES2020+/ESM，webpack 4 默认不转译 node_modules，开启全量转译
	transpileDependencies: [/.*/],
	devServer: {
		port: 5173,
		host: '0.0.0.0',
	},
	configureWebpack: {
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
				htmlparser2: path.resolve(
					__dirname,
					'node_modules/htmlparser2/lib/index.js',
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
