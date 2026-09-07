import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Tailwind 在 tailwind.config.js 配置了 prefix: 'tw-'（类名形如 tw-flex / hover:tw-bg-red-500）。
// tailwind-merge v3 的 prefix 配置只识别 Tailwind v4 的冒号前缀（tw:flex），对连字符前缀
// 不生效；故用 experimentalParseClassName 在基础类名上剥掉 tw- 参与冲突去重，
// 输出时 tailwind-merge 会保留被选中类的原始字符串，因此 tw- 前缀不会丢失。
const twMerge = extendTailwindMerge({
	experimentalParseClassName({ className, parseClassName }) {
		const parsed = parseClassName(className);
		if (parsed.baseClassName.startsWith('tw-')) {
			parsed.baseClassName = parsed.baseClassName.slice('tw-'.length);
		}
		return parsed;
	},
});

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}
