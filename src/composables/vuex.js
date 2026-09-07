/**
 * Vuex 桥接：提供 useStore。
 * Vue 2.6 的组合式 API 环境没有内置 useStore，
 * 通过 getCurrentInstance 从组件实例上注入 store。
 */
import { getCurrentInstance } from '@/composables/vue';
import store from '@/store';

export function useStore() {
  const instance = getCurrentInstance();
  return instance?.proxy?.$store ?? store;
}
