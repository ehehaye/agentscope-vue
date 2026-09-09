<template>
	<aside
		class="tw-app-sidebar tw-flex tw-w-14 tw-flex-col tw-items-center tw-gap-1 tw-border-r tw-border-border tw-bg-surface-muted tw-py-2 md:tw-w-56 md:tw-items-stretch md:tw-px-2"
	>
		<!-- Logo -->
		<div class="tw-mb-2 tw-flex tw-items-center tw-gap-2 tw-px-1 tw-py-1.5">
			<img src="/agentscope.svg" alt="AgentScope" class="tw-h-7 tw-w-7 tw-shrink-0" />
			<span class="tw-hidden tw-text-sm tw-font-semibold tw-text-foreground md:tw-inline">AgentScope</span>
		</div>

		<!-- 导航 -->
		<nav class="tw-flex tw-flex-col tw-gap-1">
			<router-link
				v-for="item in navItems"
				:key="item.to"
				:to="item.to"
				class="tw-flex tw-items-center tw-gap-3 tw-rounded-md tw-px-2 tw-py-2 tw-text-sm tw-text-muted-foreground tw-transition-colors hover:tw-bg-row-hover hover:tw-text-foreground"
				active-class="!bg-accent !text-foreground font-medium"
				:title="item.label"
			>
				<Icon :icon="item.icon" class="tw-h-5 tw-w-5 tw-shrink-0" />
				<span class="tw-hidden md:tw-inline">{{ item.label }}</span>
			</router-link>
		</nav>

		<div class="tw-flex-1"></div>

		<!-- 深色模式 -->
		<div class="tw-flex tw-items-center tw-gap-3 tw-px-2 tw-py-2 tw-text-sm tw-text-muted-foreground">
			<Icon icon="lucide:moon" class="tw-h-5 tw-w-5 tw-shrink-0" />
			<span class="tw-hidden tw-flex-1 md:tw-inline">深色模式</span>
			<el-switch
				:value="dark"
				@change="onToggleDark"
				class="tw-hidden md:tw-inline-block"
			/>
		</div>

		<!-- 服务器信息 -->
		<div class="tw-hidden tw-border-t tw-border-border tw-pt-2 md:tw-block">
			<div class="tw-truncate tw-px-2 tw-text-xs tw-text-text-tertiary" :title="serverUrl">
				{{ serverUrl }}
			</div>
			<div class="tw-flex tw-items-center tw-gap-2 tw-px-2 tw-py-1 tw-text-xs tw-text-muted-foreground">
				<Icon icon="lucide:user" class="tw-h-3.5 tw-w-3.5" />
				<span class="tw-truncate">{{ username }}</span>
				<router-link to="/setup" class="tw-ml-auto tw-text-primary hover:tw-underline" title="重新设置">
					<Icon icon="lucide:settings" class="tw-h-4 tw-w-4" />
				</router-link>
			</div>
		</div>
	</aside>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';

export default defineComponent({
	name: 'AppSidebar',
	components: { Icon },
	data() {
		return {
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
	},
});
</script>
