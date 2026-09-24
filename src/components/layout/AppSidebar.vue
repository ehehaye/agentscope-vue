<template>
	<aside
		:class="[
			'tw-app-sidebar tw-flex tw-w-14 tw-flex-col tw-items-center tw-gap-1 tw-border-r tw-border-border tw-bg-surface-muted tw-py-2',
			collapsed ? 'md:tw-w-14 md:tw-items-center md:tw-px-0' : 'md:tw-w-56 md:tw-items-stretch md:tw-px-2',
		]"
	>
		<!-- Logo -->
		<div class="tw-mb-2 tw-flex tw-items-center tw-gap-2 tw-px-1 tw-py-1.5">
			<img src="/agentscope.svg" alt="AgentScope" class="tw-h-7 tw-w-7 tw-shrink-0" />
			<span :class="['tw-text-sm tw-font-semibold tw-text-foreground', collapsed ? 'tw-hidden' : 'tw-hidden md:tw-inline']">AgentScope</span>
		</div>

		<!-- 导航 -->
		<nav class="tw-flex tw-flex-col tw-gap-1">
			<router-link
				v-for="item in navItems"
				:key="item.to"
				:to="item.to"
				class="tw-flex tw-items-center tw-gap-3 tw-rounded-md tw-px-2 tw-py-2 tw-text-sm tw-text-muted-foreground tw-transition-colors hover:tw-bg-row-hover hover:tw-text-foreground"
				active-class="!bg-accent !text-foreground font-medium"
			>
				<el-tooltip :content="item.label" placement="right" :disabled="!collapsed" :show-after="100">
					<Icon :icon="item.icon" class="tw-h-5 tw-w-5 tw-shrink-0" />
				</el-tooltip>
				<span :class="collapsed ? 'tw-hidden' : 'tw-hidden md:tw-inline'">{{ item.label }}</span>
			</router-link>
		</nav>

		<div class="tw-flex-1"></div>

		<!-- 服务器信息 -->
		<div class="tw-hidden tw-border-t tw-border-border tw-pt-2 md:tw-block">
			<div v-if="!collapsed" class="tw-truncate tw-px-2 tw-text-xs tw-text-text-tertiary" :title="serverUrl">
				{{ serverUrl }}
			</div>
			<div class="tw-flex tw-items-center tw-gap-2 tw-px-2 tw-py-1 tw-text-xs tw-text-muted-foreground">
				<template v-if="!collapsed">
					<Icon icon="lucide:user" class="tw-h-3.5 tw-w-3.5" />
					<span class="tw-truncate tw-flex-1">{{ username }}</span>
					<el-tooltip content="重新设置" placement="top" :show-after="100">
						<router-link to="/setup" class="tw-text-primary hover:tw-underline">
							<Icon icon="lucide:settings" class="tw-h-4 tw-w-4" />
						</router-link>
					</el-tooltip>
					<!-- 深色模式 -->
					<el-tooltip :content="dark ? '切换到浅色模式' : '切换到深色模式'" placement="top" :show-after="100">
						<button
							type="button"
							:class="['tw-text-primary hover:tw-underline', collapsed ? 'tw-mx-auto' : 'tw-ml-auto']"
							@click="onToggleDark"
						>
							<Icon
								:icon="dark ? 'lucide:moon' : 'lucide:sun'"
								 class="tw-h-4 tw-w-4"
							/>
						</button>
					</el-tooltip>
				</template>

				<!-- 侧边栏展开/收起 -->
				<el-tooltip :content="collapsed ? '展开侧边栏' : '收起侧边栏'" placement="top" :show-after="100">
					<button
						type="button"
						:class="['tw-text-primary hover:tw-underline', collapsed ? 'tw-mx-auto' : 'tw-ml-auto']"
						@click="toggleCollapsed"
					>
						<Icon :icon="collapsed ? 'lucide:chevrons-right' : 'lucide:chevrons-left'" class="tw-h-4 tw-w-4" />
					</button>
				</el-tooltip>
			</div>
		</div>
	</aside>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@/plugins/iconify';

export default defineComponent({
	name: 'AppSidebar',
	components: { Icon },
	data() {
		return {
			collapsed: false,
			navItems: [
				{ to: '/chat', icon: 'lucide:message-square', label: '聊天' },
				{ to: '/credential', icon: 'lucide:key-round', label: '凭证' },
				{ to: '/channel', icon: 'lucide:cable', label: '频道' },
				{ to: '/schedule', icon: 'lucide:calendar-clock', label: '日程' },
				{ to: '/knowledge', icon: 'lucide:library', label: '知识库' },
				{ to: '/mcp', icon: 'lucide:plug', label: 'MCP' },
				{ to: '/skill', icon: 'lucide:blocks', label: '技能' },
				{ to: '/dev/markdown', icon: 'lucide:file-text', label: 'Markdown 验证' },
			],
		};
	},
	mounted() {
		const saved = localStorage.getItem('sidebarCollapsed');
		if (saved !== null) {
			this.collapsed = saved === 'true';
		}
	},
	computed: {
		dark() {
			return this.$store.state.app.dark;
		},
		serverUrl() {
			return this.$store.state.app.serverUrl;
		},
		username() {
			return this.$store.state.app.username;
		},
	},
	methods: {
		onToggleDark() {
			this.$store.dispatch('app/toggleDark');
		},
		toggleCollapsed() {
			this.collapsed = !this.collapsed;
			localStorage.setItem('sidebarCollapsed', String(this.collapsed));
		},
	},
});
</script>
