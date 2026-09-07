/**
 * 组合式 API 统一桥接层（迁移方案 02 §5.1）。
 * 业务代码一律从这里导入，将来切 Vue 3 时只改本文件一行。
 */
export {
	ref,
	reactive,
	computed,
	watch,
	watchEffect,
	onMounted,
	onBeforeUnmount,
	onUnmounted,
	onErrorCaptured,
	provide,
	inject,
	readonly,
	toRefs,
	toRef,
	unref,
} from '@vue/composition-api';
