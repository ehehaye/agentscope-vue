import { ApiError } from '@/api/client';
import { toast } from '@/lib/toast';

/**
 * FastAPI 422 responses put a pydantic `.errors()` array in `detail`.
 * `client.js` stringifies that array, so what we get here is a JSON string
 * like `[{"type":"value_error","loc":[...],"msg":"..."}]`. Show only the
 * `msg` fields — that's the human-readable part; `type` / `loc` /
 * `input` are noise for end users.
 * @param {unknown} err
 * @returns {string}
 */
export function formatApiErrorForAlert(err) {
	if (err instanceof ApiError) {
		const { detail } = err;
		try {
			const parsed = JSON.parse(detail);
			if (Array.isArray(parsed)) {
				const msgs = parsed
					.map((item) =>
						item && typeof item === 'object' && 'msg' in item
							? String(item.msg)
							: null,
				)
					.filter(Boolean);
				if (msgs.length > 0) return msgs.join('\n');
			}
		} catch {
			// not JSON — fall through to raw detail
		}
		return detail;
	}
	if (err instanceof Error) return err.message;
	return String(err);
}

/**
 * 直接以 toast.error 展示 API 错误。
 * @param {unknown} err
 * @param {{title?: string}} [options]
 */
export function alertApiError(err, options = {}) {
	const message = formatApiErrorForAlert(err);
	if (options.title) {
		toast.notify({ type: 'error', title: options.title, message, duration: 5000 });
	} else {
		toast.error(message, { duration: 5000 });
	}
}
