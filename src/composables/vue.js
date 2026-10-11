/**
 * 组合式 API 统一桥接层。
 * 业务代码一律从这里导入。便于后续升级统一替换
 */
import { getCurrentInstance } from '@vue/composition-api';

/**
 * Vue 2 没有 createTextVNode 的公开导出（'vue' 包里也取不到）。
 * 这里通过 getCurrentInstance 拿到当前组件实例上的 _v 作为等价实现 —— 这是 Vue 2 的 HACK 方案，
 * 仅在组件 setup/render 上下文里可用。Vue 3 中 createTextVNode 是 'vue' 的直接导出，
 * 后续升级 Vue 3 时把本函数替换为 `export { createTextVNode } from 'vue'` 即可。
 */
export const createTextVNode = (...args) => {
  const instance = getCurrentInstance();
  return instance.proxy._v(...args);
};

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
  set,
} from '@vue/composition-api';
