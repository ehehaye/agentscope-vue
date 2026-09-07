/**
 * 组合式 API 统一桥接层。
 * 业务代码一律从这里导入。
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
	nextTick,
	defineComponent,
	getCurrentInstance,
	h,
} from 'vue';
