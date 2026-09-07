/**
 * HTTP 客户端（原生 fetch 封装，统一注入头与错误归一）。
 * - 原生 fetch（非 axios），统一注入 X-User-ID 头（localStorage）
 * - FastAPI/Pydantic 422 错误提取 detail；silent 模式不弹 toast
 * - stream() 只返回 Response，SSE 解析交给上层（见 api/session.js 的 async generator）
 */
import { toast } from '@/lib/toast';

export const getBaseUrl = () => localStorage.getItem('server_url') ?? '';
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
	const text = await res.text();
	try {
		const json = JSON.parse(text);
		if (typeof json.detail === 'string') return json.detail;
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
	const url = new URL(path, baseUrl ?? getBaseUrl());
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
			headers: buildHeaders(body !== undefined, userId),
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

	return res;
}

async function request(path, options = {}) {
	const res = await streamRequest(path, options);
	if (res.status === 204) return undefined;
	return res.json();
}

export const client = {
	get: (path, params, options) => request(path, { method: 'GET', params, ...options }),
	post: (path, body, params, options) =>
		request(path, { method: 'POST', body, params, silent: options?.silent }),
	patch: (path, body, params, options) =>
		request(path, { method: 'PATCH', body, params, silent: options?.silent }),
	delete: (path, params) => request(path, { method: 'DELETE', params }),
	stream: (path, options) => streamRequest(path, options),
};
