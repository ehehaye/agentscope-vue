/**
 * 组合式 API 统一桥接层。
 * 业务代码一律从这里导入。便于后续升级统一替换
 */
import { getCurrentInstance, watch, watchEffect, onActivated, onDeactivated, onUnmounted } from '@vue/composition-api';

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

/**
 * keep-alive 感知的 watch。
 * 创建时立即执行一次回调；组件 deactivated 期间停止监听，activated 时重新创建并立即再执行一次。
 * 不在 keep-alive 内的组件 onActivated/onDeactivated 不会触发，行为等同于普通 watch（immediate: true）。
 *
 * @param {import('@vue/composition-api').WatchSource | object | Array<import('@vue/composition-api').WatchSource | object>} source
 * @param {import('@vue/composition-api').WatchCallback} cb
 * @param {import('@vue/composition-api').WatchOptions} [options]
 * @returns {void}
 */
export function useActiveWatch(source, cb, options = {}) {
  let stop = null;
  let active = false;

  function start() {
    if (active) return;
    active = true;
    stop = watch(source, cb, { ...options, immediate: true });
  }

  function pause() {
    if (!active) return;
    active = false;
    if (stop) {
      stop();
      stop = null;
    }
  }

  start();
  onActivated(start);
  onDeactivated(pause);
  onUnmounted(pause);
}

/**
 * useActiveWatch 的 watchEffect 版本。
 * 创建时立即执行一次副作用；deactivated 期间停止，activated 时重新创建并立即再执行一次。
 *
 * @param {import('@vue/composition-api').WatchEffect} effect
 * @param {import('@vue/composition-api').WatchOptionsBase} [options]
 * @returns {void}
 */
export function useActiveWatchEffect(effect, options = {}) {
  let stop = null;
  let active = false;

  function start() {
    if (active) return;
    active = true;
    stop = watchEffect(effect, options);
  }

  function pause() {
    if (!active) return;
    active = false;
    if (stop) {
      stop();
      stop = null;
    }
  }

  start();
  onActivated(start);
  onDeactivated(pause);
  onUnmounted(pause);
}

export {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  onMounted,
  onBeforeUnmount,
  onUnmounted,
  onActivated,
  onDeactivated,
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
