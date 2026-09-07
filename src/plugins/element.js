/**
 * Element UI 全量注册（迁移方案 v2 §5.1）。
 * Phase 1 用全量引入换速度；Phase 6 再切按需注册 + 单组件 CSS 收敛体积（R16）。
 * 组件代码不直接 import element-ui，统一经此插件，便于后续替换/按需化。
 */
import Vue from 'vue';
import ElementUI from 'element-ui';

Vue.use(ElementUI);

export default ElementUI;
