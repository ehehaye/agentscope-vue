import './polyfills';
import Vue from 'vue';

import store from './store';
import router from './router';
import App from './App.vue';

import setupPlugins from './plugins/index';

setupPlugins(Vue);

new Vue({
	store,
	router,
	render: (h) => h(App),
}).$mount('#root');
