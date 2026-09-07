/**
 * Health API：后端健康探针。
 * 探针在服务端无 I/O，超过 10s 即视为后端卡住。
 */
import { client } from './client';

const HEALTH_TIMEOUT_MS = 10000;

export const healthApi = {
	/**
	 * 在地址/用户名持久化之前探测后端，因此两个参数显式传入而非读 localStorage。
	 * @param {string} baseUrl 例如 http://localhost:8000
	 * @param {string} userId  X-User-ID
	 */
	check: (baseUrl, userId) =>
		client.get('/health', undefined, {
			silent: true,
			baseUrl,
			userId,
			timeoutMs: HEALTH_TIMEOUT_MS,
		}),
};
