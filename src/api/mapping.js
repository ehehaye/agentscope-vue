/**
 * 端点映射表（SSOT）：src/api 下的每次请求都必须通过 key 从此表取 URL/Method。
 *
 * 两种模式（对应 docs/API.md 与 docs/API-java-proxy.md）：
 * - direct：前端直连 Python 后端（GET/POST/PATCH/DELETE），Base URL 为 localStorage.server_url；
 * - proxy ：经 Java 中转服务，仅开放 GET/POST，Base URL 为 localStorage.proxy_url（缺省回退 server_url）。
 *   PATCH  -> POST {path}/update
 *   DELETE -> POST {path}/delete
 *
 * 约定：
 * - 条目只写 direct；proxy 与 direct 完全相同（GET/POST 且路径不变）时省略 proxy。
 * - 路径参数统一写作 {name}，由 resolveEndpoint 插值并 encodeURIComponent。
 * - 模式由 localStorage.api_mode 控制：'direct'（默认）| 'proxy'。
 */

export const API_MODES = {
	DIRECT: 'direct',
	PROXY: 'proxy',
};

const MODE_STORAGE_KEY = 'api_mode';

export function getApiMode() {
	return localStorage.getItem(MODE_STORAGE_KEY) === API_MODES.PROXY
		? API_MODES.PROXY
		: API_MODES.DIRECT;
}

export function setApiMode(mode) {
	if (mode !== API_MODES.DIRECT && mode !== API_MODES.PROXY) {
		throw new Error(`Unknown api mode: ${mode}`);
	}
	localStorage.setItem(MODE_STORAGE_KEY, mode);
}

/**
 * 端点注册表。
 * @type {Record<string, { direct: {method: string, path: string}, proxy?: {method: string, path: string} }>}
 */
export const ENDPOINTS = {
	// ---------- health ----------
	'health.check': { direct: { method: 'GET', path: '/health' } },

	// ---------- workspace ----------
	'workspace.directories': { direct: { method: 'GET', path: '/workspace/directories' } },
	'workspace.status': { direct: { method: 'GET', path: '/workspace/status' } },

	'workspace.mcp.list': { direct: { method: 'GET', path: '/workspace/mcp' } },
	'workspace.mcp.add': { direct: { method: 'POST', path: '/workspace/mcp' } },
	'workspace.mcp.addFromLibrary': {
		direct: { method: 'POST', path: '/workspace/mcp/from-library' },
	},
	'workspace.mcp.remove': {
		direct: { method: 'DELETE', path: '/workspace/mcp/{mcpName}' },
		proxy: { method: 'POST', path: '/workspace/mcp/{mcpName}/delete' },
	},

	'workspace.skill.list': { direct: { method: 'GET', path: '/workspace/skill' } },
	/** @deprecated 路径由服务端解析，改用 upload / addFromLibrary。 */
	'workspace.skill.add': { direct: { method: 'POST', path: '/workspace/skill' } },
	/** multipart 文件夹上传（XHR），两种模式均为 POST。 */
	'workspace.skill.upload': { direct: { method: 'POST', path: '/workspace/skill/upload' } },
	'workspace.skill.addFromLibrary': {
		direct: { method: 'POST', path: '/workspace/skill/from-library' },
	},
	'workspace.skill.remove': {
		direct: { method: 'DELETE', path: '/workspace/skill/{skillName}' },
		proxy: { method: 'POST', path: '/workspace/skill/{skillName}/delete' },
	},

	// ---------- credential ----------
	'credential.list': { direct: { method: 'GET', path: '/credential/' } },
	'credential.schemas': { direct: { method: 'GET', path: '/credential/schemas' } },
	'credential.create': { direct: { method: 'POST', path: '/credential/' } },
	'credential.update': {
		direct: { method: 'PATCH', path: '/credential/{credentialId}' },
		proxy: { method: 'POST', path: '/credential/{credentialId}/update' },
	},
	'credential.delete': {
		direct: { method: 'DELETE', path: '/credential/{credentialId}' },
		proxy: { method: 'POST', path: '/credential/{credentialId}/delete' },
	},

	// ---------- model ----------
	'model.list': { direct: { method: 'GET', path: '/model/' } },
	'model.ttsList': { direct: { method: 'GET', path: '/tts-model/' } },
	'model.embeddingList': { direct: { method: 'GET', path: '/embedding-model/' } },

	// ---------- channel ----------
	'channel.listTypes': { direct: { method: 'GET', path: '/channels/types' } },
	'channel.list': { direct: { method: 'GET', path: '/channels/' } },
	'channel.get': { direct: { method: 'GET', path: '/channels/{channelId}' } },
	'channel.create': { direct: { method: 'POST', path: '/channels/' } },
	'channel.update': {
		direct: { method: 'PATCH', path: '/channels/{channelId}' },
		proxy: { method: 'POST', path: '/channels/{channelId}/update' },
	},
	'channel.delete': {
		direct: { method: 'DELETE', path: '/channels/{channelId}' },
		proxy: { method: 'POST', path: '/channels/{channelId}/delete' },
	},
	'channel.enable': { direct: { method: 'POST', path: '/channels/{channelId}/enable' } },
	'channel.disable': { direct: { method: 'POST', path: '/channels/{channelId}/disable' } },
	'channel.status': { direct: { method: 'GET', path: '/channels/{channelId}/status' } },
	'channel.listSessions': {
		direct: { method: 'GET', path: '/channels/{channelId}/sessions' },
	},
	'channel.listChatIds': {
		direct: { method: 'GET', path: '/channels/{channelId}/chat_ids' },
	},
	'channel.startBinding': { direct: { method: 'POST', path: '/channels/bindings' } },
	'channel.pollBinding': {
		direct: { method: 'GET', path: '/channels/bindings/{bindingId}' },
	},
	'channel.cancelBinding': {
		direct: { method: 'POST', path: '/channels/bindings/{bindingId}/cancel' },
	},

	// ---------- agent ----------
	'agent.list': { direct: { method: 'GET', path: '/agent/' } },
	'agent.getSchema': { direct: { method: 'GET', path: '/agent/schema/v2' } },
	'agent.create': { direct: { method: 'POST', path: '/agent/' } },
	'agent.update': {
		direct: { method: 'PATCH', path: '/agent/{agentId}' },
		proxy: { method: 'POST', path: '/agent/{agentId}/update' },
	},
	'agent.delete': {
		direct: { method: 'DELETE', path: '/agent/{agentId}' },
		proxy: { method: 'POST', path: '/agent/{agentId}/delete' },
	},

	// ---------- schedule ----------
	'schedule.list': { direct: { method: 'GET', path: '/schedule/' } },
	'schedule.create': { direct: { method: 'POST', path: '/schedule/' } },
	'schedule.update': {
		direct: { method: 'PATCH', path: '/schedule/{scheduleId}' },
		proxy: { method: 'POST', path: '/schedule/{scheduleId}/update' },
	},
	'schedule.delete': {
		direct: { method: 'DELETE', path: '/schedule/{scheduleId}' },
		proxy: { method: 'POST', path: '/schedule/{scheduleId}/delete' },
	},
	'schedule.listSessions': {
		direct: { method: 'GET', path: '/schedule/{scheduleId}/sessions' },
	},

	// ---------- knowledge base ----------
	'kb.list': { direct: { method: 'GET', path: '/knowledge_bases/' } },
	'kb.listEmbeddingModels': {
		direct: { method: 'GET', path: '/knowledge_bases/embedding_models' },
	},
	'kb.listChunkers': { direct: { method: 'GET', path: '/knowledge_bases/chunkers' } },
	'kb.middlewareParametersSchema': {
		direct: { method: 'GET', path: '/knowledge_bases/middleware/parameters_schema' },
	},
	'kb.supportedContentTypes': {
		direct: { method: 'GET', path: '/knowledge_bases/supported_content_types' },
	},
	'kb.create': { direct: { method: 'POST', path: '/knowledge_bases/' } },
	'kb.update': {
		direct: { method: 'PATCH', path: '/knowledge_bases/{knowledgeBaseId}' },
		proxy: { method: 'POST', path: '/knowledge_bases/{knowledgeBaseId}/update' },
	},
	'kb.delete': {
		direct: { method: 'DELETE', path: '/knowledge_bases/{knowledgeBaseId}' },
		proxy: { method: 'POST', path: '/knowledge_bases/{knowledgeBaseId}/delete' },
	},
	'kb.listDocuments': {
		direct: { method: 'GET', path: '/knowledge_bases/{knowledgeBaseId}/documents' },
	},
	'kb.listDocumentChunks': {
		direct: {
			method: 'GET',
			path: '/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/chunks',
		},
	},
	'kb.createDocumentDownloadToken': {
		direct: {
			method: 'POST',
			path: '/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/download_token',
		},
	},
	/** 浏览器直构的下载/原文 URL（Query: token、download）。 */
	'kb.documentContent': {
		direct: {
			method: 'GET',
			path: '/knowledge_bases/{knowledgeBaseId}/documents/{documentId}',
		},
	},
	/** client.stream 读取文档原始文本（非 JSON）。 */
	'kb.fetchDocumentText': {
		direct: {
			method: 'GET',
			path: '/knowledge_bases/{knowledgeBaseId}/documents/{documentId}',
		},
	},
	'kb.documentStatus': {
		direct: {
			method: 'GET',
			path: '/knowledge_bases/{knowledgeBaseId}/documents/status',
		},
	},
	/** multipart 文档上传（XHR，字段 file）。 */
	'kb.uploadDocument': {
		direct: {
			method: 'POST',
			path: '/knowledge_bases/{knowledgeBaseId}/documents',
		},
	},
	'kb.deleteDocument': {
		direct: {
			method: 'DELETE',
			path: '/knowledge_bases/{knowledgeBaseId}/documents/{documentId}',
		},
		proxy: {
			method: 'POST',
			path: '/knowledge_bases/{knowledgeBaseId}/documents/{documentId}/delete',
		},
	},
	'kb.search': {
		direct: { method: 'POST', path: '/knowledge_bases/{knowledgeBaseId}/search' },
	},

	// ---------- mcp（用户级已安装记录） ----------
	'mcp.list': { direct: { method: 'GET', path: '/mcp' } },
	'mcp.update': {
		direct: { method: 'PATCH', path: '/mcp/{mcpId}' },
		proxy: { method: 'POST', path: '/mcp/{mcpId}/update' },
	},
	'mcp.remove': {
		direct: { method: 'DELETE', path: '/mcp/{mcpId}' },
		proxy: { method: 'POST', path: '/mcp/{mcpId}/delete' },
	},

	// ---------- skill（用户级技能库） ----------
	'skill.list': { direct: { method: 'GET', path: '/skill' } },
	'skill.get': { direct: { method: 'GET', path: '/skill/{skillId}' } },
	'skill.remove': {
		direct: { method: 'DELETE', path: '/skill/{skillId}' },
		proxy: { method: 'POST', path: '/skill/{skillId}/delete' },
	},

	// ---------- hub：MCP 广场 ----------
	'hub.mcp.listHubs': { direct: { method: 'GET', path: '/hub/mcp' } },
	'hub.mcp.listCards': {
		direct: { method: 'GET', path: '/hub/mcp/{hubId}/cards' },
	},
	'hub.mcp.getCard': {
		direct: { method: 'GET', path: '/hub/mcp/{hubId}/cards/{cardId}' },
	},
	'hub.mcp.install': {
		direct: { method: 'POST', path: '/hub/mcp/{hubId}/cards/{cardId}/install' },
	},

	// ---------- hub：技能广场 ----------
	'hub.skill.listHubs': { direct: { method: 'GET', path: '/hub/skill' } },
	'hub.skill.listCards': {
		direct: { method: 'GET', path: '/hub/skill/{hubId}/cards' },
	},
	'hub.skill.getCard': {
		direct: { method: 'GET', path: '/hub/skill/{hubId}/cards/{cardId}' },
	},
	'hub.skill.install': {
		direct: { method: 'POST', path: '/hub/skill/{hubId}/cards/{cardId}/install' },
	},

	// ---------- session ----------
	'session.list': { direct: { method: 'GET', path: '/sessions/' } },
	'session.create': { direct: { method: 'POST', path: '/sessions/' } },
	'session.update': {
		direct: { method: 'PATCH', path: '/sessions/{sessionId}' },
		proxy: { method: 'POST', path: '/sessions/{sessionId}/update' },
	},
	'session.delete': {
		direct: { method: 'DELETE', path: '/sessions/{sessionId}' },
		proxy: { method: 'POST', path: '/sessions/{sessionId}/delete' },
	},
	'session.interrupt': {
		direct: { method: 'POST', path: '/sessions/{sessionId}/interrupt' },
	},
	'session.messages': {
		direct: { method: 'GET', path: '/sessions/{sessionId}/messages' },
	},
	/** SSE 长连接事件流（text/event-stream，非 JSON 单次响应）。 */
	'session.streamEvents': {
		direct: { method: 'GET', path: '/sessions/{sessionId}/stream' },
	},

	// ---------- chat ----------
	'chat.trigger': { direct: { method: 'POST', path: '/chat/' } },
};

function interpolate(path, pathParams) {
	return path.replace(/\{(\w+)\}/g, (match, name) => {
		const value = pathParams?.[name];
		if (value === undefined || value === null) {
			throw new Error(`Missing path parameter "${name}"`);
		}
		return encodeURIComponent(value);
	});
}

/**
 * 按模式解析端点。
 * @param {string} key ENDPOINTS 中的键
 * @param {{ pathParams?: Record<string, string|number>, mode?: string }} [options]
 * @returns {{ method: string, path: string }}
 */
export function resolveEndpoint(key, { pathParams, mode = getApiMode() } = {}) {
	const entry = ENDPOINTS[key];
	if (!entry) {
		throw new Error(`Unknown endpoint key: ${key}`);
	}
	const spec = mode === API_MODES.PROXY && entry.proxy ? entry.proxy : entry.direct;
	return { method: spec.method, path: interpolate(spec.path, pathParams) };
}
