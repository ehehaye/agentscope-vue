/**
 * Vuex workspace 模块。
 * 职责：工作区目录、状态、git 状态；供侧边栏与多页面共享。
 */
import { workspaceApi } from '@/api';

export default {
	namespaced: true,

	state: () => ({
		directories: [],
		status: null,
		gitStatus: null,
		loading: false,
	}),

	mutations: {
		SET_DIRECTORIES(state, directories) {
			state.directories = directories;
		},
		SET_STATUS(state, status) {
			state.status = status;
		},
		SET_GIT_STATUS(state, gitStatus) {
			state.gitStatus = gitStatus;
		},
		SET_LOADING(state, loading) {
			state.loading = loading;
		},
		RESET(state) {
			state.directories = [];
			state.status = null;
			state.gitStatus = null;
			state.loading = false;
		},
	},

	actions: {
		/**
		 * 并发拉取目录列表与会话状态。
		 * @param {{ agentId: string, sessionId: string, path?: string }} payload
		 */
		async fetchAll({ commit }, { agentId, sessionId, path = '' }) {
			commit('SET_LOADING', true);
			try {
				const [directories, status] = await Promise.all([
					workspaceApi.directories(agentId, sessionId, path),
					workspaceApi.status(agentId, sessionId),
				]);
				commit('SET_DIRECTORIES', directories?.entries ?? directories ?? []);
				commit('SET_STATUS', status ?? null);
				if (status?.git) {
					commit('SET_GIT_STATUS', status.git);
				}
			} finally {
				commit('SET_LOADING', false);
			}
		},

		/**
		 * 定时刷新工作区状态（git/路径）。
		 * @param {{ agentId: string, sessionId: string }} payload
		 */
		async refreshStatus({ commit }, { agentId, sessionId }) {
			try {
				const status = await workspaceApi.status(agentId, sessionId);
				commit('SET_STATUS', status ?? null);
				commit('SET_GIT_STATUS', status?.git ?? null);
			} catch {
				// status 接口默认 silent，失败时不打扰用户
			}
		},

		/** 切换会话/退出时清空。 */
		reset({ commit }) {
			commit('RESET');
		},
	},

	getters: {
		/** 目录是否为空（已加载且空）。 */
		isEmpty: (state) => !state.loading && state.directories.length === 0,
		/** 当前工作区根路径。 */
		rootPath: (state) => state.status?.workspace_path ?? '',
	},
};
