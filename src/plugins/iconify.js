/**
 * Iconify 统一入口：在「离线 / 在线」两套实现之间全局切换。
 *
 * 开关在 vue.config.js：__ICONIFY_OFFLINE__ 由 DefinePlugin 编译期注入为
 * 布尔字面量（默认 true，构建时 ICONIFY_OFFLINE=false 关闭），
 * 不可达分支会被 webpack 直接剪除，只有一侧的依赖会进包。
 *
 * 离线（内网默认）
 *   使用 @iconify/vue2/offline：不含任何网络请求代码，未注册的图标直接不渲染；
 *   lucide 图标集打进包并在启动时注册，全程零外网请求。
 *
 * 在线（ICONIFY_OFFLINE=false）
 *   使用 @iconify/vue2：未注册图标自动请求 https://api.iconify.design，
 *   图标集 JSON 不会被打进包。
 *
 * 注意：业务代码只允许从本模块导入 Icon / addCollection / addIcon，
 * 不要直接 import '@iconify/vue2' 或 '@iconify/vue2/offline'——
 * 两个入口各自持有独立的图标存储实例，混用会导致注册的图标不生效。
 */

const __ICONIFY_OFFLINE__ = true;

let api;
if (__ICONIFY_OFFLINE__) {
	api = require('@iconify/vue2/offline');
	// 注册本地 lucide 图标集（在线模式走 API，图标数据不进包）
	api.addCollection(require('@iconify-json/lucide/icons.json'));
} else {
	api = require('@iconify/vue2');
}

export const Icon = api.Icon;
export const addCollection = api.addCollection;
export const addIcon = api.addIcon;

export default api;
