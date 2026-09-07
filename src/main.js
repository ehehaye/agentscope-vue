import Vue from 'vue';
import VueCompositionAPI from '@vue/composition-api';

// 顺序：Composition API → store/router → Element → 样式。
Vue.use(VueCompositionAPI);

import store from './store';
import router from './router';
import App from './App.vue';
import './plugins/element';

// 字体（JS import 以便 vite 正确解析 fontsource 包内相对字体文件）
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';

// CSS 引入顺序（迁移方案 v2 §5.3）：
// 1. Tailwind v4 + index.css 主题变量（:root / .dark 单点）
// 2. Element 组件样式
// 3. element-overrides（把 Element 表面色映射到 CSS 变量，含深色兜底）
import './index.css';
import 'element-ui/lib/theme-chalk/index.css';
import './styles/element-overrides.less';

new Vue({
	store,
	router,
	render: (h) => h(App),
}).$mount('#root');
