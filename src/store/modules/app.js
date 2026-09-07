/**
 * Vuex app 模块。
 * 职责：深色模式、服务器连接配置（setup）。
 * localStorage 键：server_url / username；主题用 theme。
 */

const THEME_KEY = 'theme';
const SERVER_URL_KEY = 'server_url';
const USERNAME_KEY = 'username';

function initialDark() {
	// index.html 首帧脚本已按相同规则设置过 class，这里取真值，避免二次闪烁。
	return document.documentElement.classList.contains('dark');
}

export default {
	namespaced: true,

	state: () => ({
		dark: initialDark(),
		serverUrl: localStorage.getItem(SERVER_URL_KEY) ?? '',
		username: localStorage.getItem(USERNAME_KEY) ?? '',
	}),

	getters: {
		/** setup 门禁：地址与用户名均已持久化才放行。 */
		setupComplete: (state) => Boolean(state.serverUrl && state.username),
	},

	mutations: {
		SET_DARK(state, dark) {
			state.dark = dark;
			document.documentElement.classList.toggle('dark', dark);
			try {
				localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
			} catch {
				/* 隐私模式等场景下降级为仅当前会话 */
			}
		},
		SET_CONFIG(state, { serverUrl, username }) {
			state.serverUrl = serverUrl;
			state.username = username;
			try {
				localStorage.setItem(SERVER_URL_KEY, serverUrl);
				localStorage.setItem(USERNAME_KEY, username);
			} catch {
				/* ignore */
			}
		},
	},

	actions: {
		toggleDark({ commit, state }) {
			commit('SET_DARK', !state.dark);
		},
		/** setup 页探测成功后持久化连接配置。 */
		saveConfig({ commit }, payload) {
			commit('SET_CONFIG', payload);
		},
	},
};
