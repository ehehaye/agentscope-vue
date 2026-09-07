import { defineConfig } from 'vite';
import { createVuePlugin } from 'vite-plugin-vue2';
import { createSvgPlugin } from 'vite-plugin-vue2-svg';
import path from 'node:path';

// Vue 2.6 骨架构建配置（迁移方案 v2 §3.1 已验证矩阵）：
// - vite ^3 + vite-plugin-vue2@2（Vue 2.6 SFC 编译）
// - Tailwind v4 走 PostCSS（@tailwindcss/postcss，vite 插件要 vite≥5）
// - SVG → Vue 2 组件用 vite-plugin-vue2-svg（vite-svg-loader 依赖 Vue3 编译器，不可用）
// - Less 变量经 additionalData 全局注入 styles/variables.less
export default defineConfig(({ mode }) => ({
	plugins: [createVuePlugin(), createSvgPlugin()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	build: {
		sourcemap: mode === 'development',
	},
	css: {
		preprocessorOptions: {
			less: {
				additionalData: '@import "@/styles/variables.less";',
			},
		},
	},
	server: {
		port: 5173,
		// 前端直连 Python 服务（localStorage server_url，CORS 已开 *）；
		// 如后端起在本机 8000，可在 setup 页填 http://localhost:8000。
	},
	optimizeDeps: {
		include: ['mime-types'],
	},
}));
