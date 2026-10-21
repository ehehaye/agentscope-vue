import Vue from 'vue';
import CompositionApi from '@vue/composition-api';

// 全局安装组合式 API：部分组件（如 TextNodeRenderer）依赖 setup 返回渲染函数。
Vue.use(CompositionApi);
