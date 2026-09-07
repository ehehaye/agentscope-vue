/**
 * Toast 薄封装（迁移方案 v2 §5.5）：对齐旧版 sonner 的使用习惯。
 * - toast.success/error/warning/info → Element Message（轻提示，顶部居中短文案）
 * - 组件内也可直接用 this.$message / this.$notify（Element 全量注册后可用）
 * 注意：Element 的 Message/Notification 是模块级函数，需在 plugins/element.js
 * 注册之后调用，因此这里惰性 import element-ui 的样式无关实例。
 */
import { Message, Notification } from 'element-ui';

function normalize(message, options = {}) {
	if (typeof message === 'string') return { message, ...options };
	return { message: String(message), ...options };
}

export const toast = {
	success(message, options) {
		return Message({ type: 'success', ...normalize(message, options) });
	},
	error(message, options) {
		return Message({ type: 'error', duration: 5000, ...normalize(message, options) });
	},
	warning(message, options) {
		return Message({ type: 'warning', ...normalize(message, options) });
	},
	info(message, options) {
		return Message({ type: 'info', ...normalize(message, options) });
	},
	/**
	 * 带标题/描述的通知（对齐旧 sonner top-right 位姿）。
	 * @param {{title?: string, message: string, type?: 'success'|'error'|'warning'|'info', duration?: number}} opts
	 */
	notify({ title, message, type = 'info', duration = 4500 }) {
		return Notification({
			title,
			message,
			type,
			duration,
			position: 'top-right',
		});
	},
};

export default toast;
