/**
 * Vuex 桥接（迁移方案 02 §5.1）。
 * Vue 2.6 + composition-api 中没有内置 useStore，
 * 通过 getCurrentInstance 从组件实例上注入 store。
 */
import { getCurrentInstance } from '@/composables/vue';
import store from '@/store';

export function useStore() {
  const instance = getCurrentInstance();
  return instance?.proxy?.$store ?? store;
}
