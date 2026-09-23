/**
 * HTTP 客户端（原生 fetch 封装，统一注入头与错误归一）。
 * - 所有请求通过端点 key 从 mapping.js 解析 URL/Method，支持 direct（直连 Python）/ proxy（Java 中转）两种模式
 * - 原生 fetch（非 axios），统一注入 X-User-ID 头（localStorage）
 * - FastAPI/Pydantic 422 错误提取 detail；silent 模式不弹 toast
 * - stream: true 只返回 Response，SSE 解析交给上层（见 api/session.js 的 async generator）
 */
import { toast } from '@/lib/toast';
import { API_MODES, getApiMode, resolveEndpoint } from './mapping';
import { isValidJsonStr } from '@/utils/common';

export const getBaseUrl = (mode = getApiMode()) => (localStorage.getItem('server_url') ?? '')

export const getUserId = () => localStorage.getItem('username') ?? '';

/** 非 2xx 响应的结构化错误；message 为可读 detail。 */
export class ApiError extends Error {
	constructor(status, detail) {
		super(detail);
		this.name = 'ApiError';
		this.status = status;
		this.detail = detail;
	}
}

/** 超时时上报的状态码（真实 408 来自服务端，语义一致）。 */
export const TIMEOUT_STATUS = 408;

function buildHeaders(hasBody, userId) {
	const headers = { 'X-User-ID': userId ?? getUserId() };
	if (hasBody) headers['Content-Type'] = 'application/json';
	return headers;
}

/** 解析响应体，优先提取 JSON detail。 */
async function extractErrorDetail(res) {
	const text = await res.clone().text();
	try {
		const json = JSON.parse(text);
		if (typeof json.detail === 'string') return json.detail;
		// FastAPI 422：detail 为 pydantic 错误数组，只保留可读的 msg 字段
		if (Array.isArray(json.detail)) {
			const msgs = json.detail
				.map((item) =>
					item && typeof item === 'object' && 'msg' in item
						? String(item.msg)
						: null,
				)
				.filter(Boolean);
			if (msgs.length > 0) return msgs.join('\n');
		}
		if (json.detail !== undefined) return JSON.stringify(json.detail);
	} catch {
		// 非 JSON，回落纯文本
	}
	return text || res.statusText;
}

async function streamRequest(path, options = {}) {
	const {
		method = 'GET',
		body,
		params,
		signal,
		silent = false,
		baseUrl,
		userId,
		timeoutMs,
	} = options;
	
	const { pathname, origin } = new URL(baseUrl ?? getBaseUrl())
	const url = new URL(`${pathname}/${path}/`.replace(/\/{2,}/g, '/'), origin); 
	if (params) {
		Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
	}

	// AbortSignal.timeout 中止时抛 TimeoutError，与调用方自身取消区分。
	const deadline = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined;
	const combined = deadline && signal ? AbortSignal.any([signal, deadline]) : (deadline ?? signal);

	let res;
	try {
		res = await fetch(url.toString(), {
			method,
			headers: buildHeaders(body !== undefined && body !== null, userId),
			body: body ? JSON.stringify(body) : undefined,
			signal: combined,
		});
	} catch (e) {
		if (e instanceof DOMException && e.name === 'AbortError') throw e;
		const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
		const error = timedOut
			? new ApiError(TIMEOUT_STATUS, '服务器响应超时。')
			: new ApiError(0, '无法连接到服务器，请检查服务器地址和网络。');
		if (!silent) toast.error(error.detail);
		throw error;
	}

	if (!res.ok) {
		const detail = await extractErrorDetail(res);
		const error = new ApiError(res.status, detail);
		if (!silent) toast.error(detail);
		throw error;
	}
	
	// 提取代理错误（在此填写你的自定义校验逻辑）
	if (getApiMode() === API_MODES.PROXY && res.headers.get('content-type')?.includes('application/json')) {
		const text = await res.clone().text();
		if (isValidJsonStr(text)) {
			const json = JSON.parse(text);
			if (json.success === false) {
				const error = new ApiError(json.code, json.message);
				toast.error(json.message);
				throw error;
			}
		}
	}

	return res;
}

/**
 * 按 mapping 配置发起请求。
 * @param {string} key ENDPOINTS 端点键
 * @param {object} [options]
 * @param {Record<string, string|number>} [options.pathParams] 填充路径中的 {xxx}
 * @param {Record<string, any>} [options.params] URL Query 参数
 * @param {any} [options.body] JSON 请求体（null/undefined 时不发送 body）
 * @param {boolean} [options.stream] 返回原始 Response 而非解析 JSON
 * @param {boolean} [options.silent] 失败时不弹 toast
 * @param {AbortSignal} [options.signal]
 * @param {string} [options.mode] 强制指定 direct/proxy，默认取当前全局模式
 * @param {string} [options.baseUrl] 覆盖 Base URL
 * @param {string} [options.userId] 覆盖 X-User-ID
 * @param {number} [options.timeoutMs] 超时毫秒
 */
async function request(key, options = {}) {
	const {
		pathParams,
		params,
		body,
		stream: rawStream = false,
		signal,
		silent = false,
		mode = getApiMode(),
		baseUrl,
		userId,
		timeoutMs,
	} = options;

	const { method, path } = resolveEndpoint(key, { pathParams, mode });
	const res = await streamRequest(path, {
		method,
		body,
		params,
		signal,
		silent,
		baseUrl: baseUrl ?? getBaseUrl(mode),
		userId,
		timeoutMs,
	});

	if (rawStream) return res;
	if (res.status === 204) return undefined;
	return res.json();
}

export const client = {
	request,
};
