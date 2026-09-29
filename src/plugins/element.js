/**
 * Element UI 全量注册。
 * 组件代码不直接 import element-ui，统一经此插件。
 */
import ElementUI from 'element-ui';

export default function setupElement(Vue) {
  Vue.use(ElementUI);
}
