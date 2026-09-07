/**
 * Vuex upload 模块：上传任务状态与并发调度。
 *
 * 设计要点：
 * - state 只放可序列化的 tasks 数组；File / AbortController / 调度标记
 *   放在模块级 Map/Set（非响应式），避免 Vue 2.6 把 File 对象深层代理。
 * - 上传 XHR 生命周期由 startUpload 驱动；scheduler 在 enqueue/cancel 后
 *   手动触发。
 */
import { knowledgeBaseApi } from '@/api';
// 注意：循环依赖（store/index.js → upload.js → store）。
// 这里只在运行时（action/scheduler 内）读取 store，模块求值阶段不访问，
// 符合 ES module 循环依赖安全模式。
import store from '@/store';

/** 终态：ready / error / cancelled。 */
function isTerminal(phase) {
	return phase === 'ready' || phase === 'error' || phase === 'cancelled';
}

/** 服务端非终态：仍需轮询的阶段。 */
const POLLABLE_PHASES = new Set(['pending', 'parsing', 'chunking', 'indexing']);

const MAX_CONCURRENT_UPLOADS = 3;

// ── 非响应式副作用状态 ────────────────────────────────────────────────
/** taskId → File（不上响应式 state，File 不可序列化）。 */
const files = new Map();
/** taskId → AbortController（取消上传用）。 */
const controllers = new Map();
/** 已被 scheduler 启动过的 taskId（幂等）。 */
const started = new Set();

function newTaskId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 启动单个上传任务：创建 XHR、绑定进度、提交 mutation。
 * 由 scheduler 调用，不直接暴露给组件。
 */
function startUpload(task) {
	const file = files.get(task.taskId);
	if (!file) {
		store.commit('upload/UPLOAD_FAILED', {
			taskId: task.taskId,
			error: 'Internal error: missing file payload.',
		});
		return;
	}
	const controller = new AbortController();
	controllers.set(task.taskId, controller);
	store.commit('upload/START_UPLOAD', task.taskId);

	knowledgeBaseApi
		.uploadDocument(task.knowledgeBaseId, file, {
			signal: controller.signal,
			onProgress: ({ loaded, total }) => {
				store.commit('upload/PROGRESS', { taskId: task.taskId, loaded, total });
			},
		})
		.then((response) => {
			store.commit('upload/UPLOAD_DONE', {
				taskId: task.taskId,
				documentId: response.document_id,
				status: response.status,
			});
		})
		.catch((err) => {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			const message = err instanceof Error ? err.message : 'Upload failed.';
			store.commit('upload/UPLOAD_FAILED', { taskId: task.taskId, error: message });
		})
		.finally(() => {
			controllers.delete(task.taskId);
			files.delete(task.taskId);
			// 一个槽位释放后可能有排队任务，再跑一次调度
			runScheduler();
		});
}

/**
 * 并发调度器：最多 MAX_CONCURRENT_UPLOADS 个 uploading 同时跑，
 * 其余 queued 排队。上传副作用由本模块级调度器统一触发。
 */
function runScheduler() {
	const tasks = store.state.upload.tasks;
	const running = tasks.filter((t) => t.phase === 'uploading').length;
	const queued = tasks.filter((t) => t.phase === 'queued');
	const slots = MAX_CONCURRENT_UPLOADS - running;
	if (slots <= 0 || queued.length === 0) return;
	for (const task of queued.slice(0, slots)) {
		if (started.has(task.taskId)) continue;
		started.add(task.taskId);
		startUpload(task);
	}
}

export default {
	namespaced: true,

	state: () => ({
		tasks: [],
	}),

	mutations: {
		ADD(state, tasks) {
			state.tasks = [...state.tasks, ...tasks];
		},
		START_UPLOAD(state, taskId) {
			state.tasks = state.tasks.map((t) =>
				t.taskId === taskId ? { ...t, phase: 'uploading', loaded: 0 } : t,
			);
		},
		PROGRESS(state, { taskId, loaded, total }) {
			state.tasks = state.tasks.map((t) =>
				t.taskId === taskId
					? {
							...t,
							loaded,
							// 浏览器未算出 size 时用 total 兜底
							size: t.size || total,
						}
					: t,
			);
		},
		UPLOAD_DONE(state, { taskId, documentId, status }) {
			state.tasks = state.tasks.map((t) =>
				t.taskId === taskId
					? { ...t, documentId, phase: status, loaded: t.size }
					: t,
			);
		},
		UPLOAD_FAILED(state, { taskId, error }) {
			state.tasks = state.tasks.map((t) =>
				t.taskId === taskId ? { ...t, phase: 'error', error } : t,
			);
		},
		CANCEL(state, taskId) {
			state.tasks = state.tasks.map((t) =>
				t.taskId === taskId ? { ...t, phase: 'cancelled' } : t,
			);
		},
		REMOVE(state, taskId) {
			state.tasks = state.tasks.filter((t) => t.taskId !== taskId);
		},
		SERVER_STATUS(state, { knowledgeBaseId, items }) {
			const byId = new Map(items.map((i) => [i.id, i]));
			state.tasks = state.tasks.map((t) => {
				if (t.knowledgeBaseId !== knowledgeBaseId) return t;
				if (!t.documentId) return t;
				const match = byId.get(t.documentId);
				if (!match) return t;
				// 客户端 cancelled 终态优先（用户已表态）
				if (t.phase === 'cancelled') return t;
				if (t.phase === match.status && t.error === match.error) return t;
				return { ...t, phase: match.status, error: match.error };
			});
		},
		CLEAR_FINISHED(state, knowledgeBaseId) {
			state.tasks = state.tasks.filter(
				(t) => t.knowledgeBaseId !== knowledgeBaseId || !isTerminal(t.phase),
			);
		},
	},

	actions: {
		/**
		 * 入队一批文件到指定知识库。
		 * @param {{ knowledgeBaseId: string, files: File[] }} payload
		 */
		enqueue({ commit }, { knowledgeBaseId, files: fileList }) {
			const now = Date.now();
			const newTasks = fileList.map((file) => {
				const taskId = newTaskId();
				files.set(taskId, file);
				return {
					taskId,
					knowledgeBaseId,
					filename: file.name,
					size: file.size,
					documentId: null,
					phase: 'queued',
					loaded: 0,
					error: null,
					createdAt: now,
				};
			});
			commit('ADD', newTasks);
			runScheduler();
			return newTasks;
		},

		/**
		 * 取消任务：queued 直接移除，uploading 中止 XHR，终态等同 dismiss，
		 * 服务端阶段（pending/parsing/...）不处理（走文档删除流程）。
		 */
		cancel({ commit, state }, taskId) {
			const task = state.tasks.find((t) => t.taskId === taskId);
			if (!task) return;
			if (task.phase === 'queued') {
				files.delete(taskId);
				started.delete(taskId);
				commit('REMOVE', taskId);
				runScheduler();
				return;
			}
			if (task.phase === 'uploading') {
				controllers.get(taskId)?.abort();
				commit('CANCEL', taskId);
				return;
			}
			if (isTerminal(task.phase)) {
				commit('REMOVE', taskId);
				return;
			}
			// 服务端阶段不可取消，留给文档删除
		},

		/** 从列表移除一个终态任务（UI 关闭）。 */
		dismiss({ commit }, taskId) {
			commit('REMOVE', taskId);
		},

		/** 清除某知识库下所有终态任务。 */
		clearFinishedForKb({ commit }, knowledgeBaseId) {
			commit('CLEAR_FINISHED', knowledgeBaseId);
		},

		/**
		 * 应用服务端轮询返回的状态快照（按 documentId 匹配）。
		 * @param {{ knowledgeBaseId: string, items: Array<{id,status,error}> }} payload
		 */
		applyServerStatuses({ commit }, { knowledgeBaseId, items }) {
			commit('SERVER_STATUS', { knowledgeBaseId, items });
		},
	},

	getters: {
		/** 某知识库的任务列表。 */
		tasksForKb: (state) => (knowledgeBaseId) =>
			state.tasks.filter((t) => t.knowledgeBaseId === knowledgeBaseId),

		/** 某知识库下需要轮询的文档 id（有 documentId 且非终态服务端阶段）。 */
		pollableDocumentIds: (state) => (knowledgeBaseId) => {
			const out = [];
			for (const t of state.tasks) {
				if (t.knowledgeBaseId !== knowledgeBaseId) continue;
				if (!t.documentId) continue;
				if (POLLABLE_PHASES.has(t.phase)) out.push(t.documentId);
			}
			return out;
		},

		/** 是否有上传中/排队中的任务（用于 beforeunload 警告）。 */
		hasInFlight: (state) =>
			state.tasks.some((t) => t.phase === 'queued' || t.phase === 'uploading'),
	},
};
