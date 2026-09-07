import Vue from 'vue';
import VueRouter from 'vue-router';
import store from '@/store';

Vue.use(VueRouter);

// Phase 1 骨架路由：setup 门禁 + AppLayout 壳 + /dev/markdown 渲染验证页。
// 业务页面（凭证/知识库/MCP/聊天…）随 Phase 2-4 逐个挂入。
const routes = [
	{
		path: '/setup',
		name: 'setup',
		component: () => import('@/views/setup/index.vue'),
		meta: { public: true, title: '初始化设置' },
	},
	{
		path: '/',
		component: () => import('@/components/layout/AppLayout.vue'),
		children: [
			{ path: '', redirect: '/chat' },
			{
					path: 'chat',
					name: 'chat',
					component: () => import('@/views/chat/index.vue'),
					meta: { title: '聊天' },
				},
			{
				path: 'credential',
				name: 'credential',
				component: () => import('@/views/credential/index.vue'),
				meta: { title: '凭证' },
			},
			{
				path: 'channel',
				name: 'channel',
				component: () => import('@/views/channel/index.vue'),
				meta: { title: '频道' },
			},
			{
				path: 'schedule',
				name: 'schedule',
				component: () => import('@/views/schedule/index.vue'),
				meta: { title: '日程' },
			},
			{
				path: 'knowledge',
				name: 'knowledge',
				component: () => import('@/views/knowledge/index.vue'),
				meta: { title: '知识库' },
			},
			{
							path: 'knowledge/:kbId',
							name: 'knowledge-detail',
							component: () => import('@/views/knowledge/index.vue'),
							meta: { title: '知识库' },
						},
						{
							path: 'mcp',
							name: 'mcp',
							component: () => import('@/views/mcp/index.vue'),
							meta: { title: 'MCP' },
						},
						{
							path: 'mcp/:hubId',
							name: 'mcp-hub',
							component: () => import('@/views/mcp/index.vue'),
							meta: { title: 'MCP' },
						},
						{
							path: 'skill',
							name: 'skill',
							component: () => import('@/views/skill/index.vue'),
							meta: { title: '技能' },
						},
						{
							path: 'skill/:hubId',
							name: 'skill-hub',
							component: () => import('@/views/skill/index.vue'),
							meta: { title: '技能' },
						},
						{
							path: 'dev/markdown',
							name: 'dev-markdown',
							component: () => import('@/views/dev/MarkdownDevPage.vue'),
							meta: { title: 'Markdown 渲染验证' },
						},
		],
	},
	{ path: '*', redirect: '/' },
];

const router = new VueRouter({
	mode: 'hash',
	routes,
});

// setup 门禁：未配置服务器地址/用户名时一律重定向 /setup（02 §3 setup 步骤 5）。
router.beforeEach((to, _from, next) => {
	const ready = store.getters['app/setupComplete'];
	if (!ready && to.path !== '/setup') {
		next('/setup');
	} else if (ready && to.path === '/setup') {
		next('/');
	} else {
		next();
	}
});

router.afterEach((to) => {
	if (to.meta?.title) document.title = `${to.meta.title} · AgentScope`;
});

export default router;
