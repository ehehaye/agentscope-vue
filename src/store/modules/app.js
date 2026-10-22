/**
 * Vuex app 模块。
 * 职责：深色模式、服务器连接配置（setup）。
 * localStorage 键统一由 constants/app-state.js 的 AppStorageKeys 管理。
 */

import { API_MODES } from '@/api/mapping';
import { AppStorageKeys, AppDefaults } from '@/constants/app-state';

function initialDark() {
  // index.html 首帧脚本已按相同规则设置过 class，这里取真值，避免二次闪烁。
  return document.documentElement.classList.contains('dark');
}

export default {
  namespaced: true,

  state: () => ({
    dark: initialDark(),
    serverUrl: localStorage.getItem(AppStorageKeys.SERVER_URL) ?? AppDefaults.SERVER_URL,
    username: localStorage.getItem(AppStorageKeys.USERNAME) ?? AppDefaults.USERNAME,
    apiMode: localStorage.getItem(AppStorageKeys.API_MODE) ?? API_MODES.DIRECT,
    verified: localStorage.getItem(AppStorageKeys.VERIFIED) === 'true',
  }),

  getters: {
    /** setup 门禁：地址、用户名已持久化且连接已验证通过才放行。 */
    setupComplete: (state) => Boolean(state.serverUrl && state.username && state.verified),
  },

  mutations: {
    SET_DARK(state, dark) {
      state.dark = dark;
      document.documentElement.classList.toggle('dark', dark);
      try {
        localStorage.setItem(AppStorageKeys.THEME, dark ? 'dark' : 'light');
      } catch {
        /* 隐私模式等场景下降级为仅当前会话 */
      }
    },
    SET_CONFIG(state, { serverUrl, username, apiMode }) {
      state.serverUrl = serverUrl;
      state.username = username;
      state.apiMode = apiMode;
      state.verified = true;
      try {
        localStorage.setItem(AppStorageKeys.SERVER_URL, serverUrl);
        localStorage.setItem(AppStorageKeys.USERNAME, username);
        localStorage.setItem(AppStorageKeys.API_MODE, apiMode);
        localStorage.setItem(AppStorageKeys.VERIFIED, 'true');
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
