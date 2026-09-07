<template>
	<aside
		class="app-sidebar flex w-14 flex-col items-center gap-1 border-r border-border bg-surface-muted py-2 md:w-56 md:items-stretch md:px-2"
	>
		<!-- Logo -->
		<div class="mb-2 flex items-center gap-2 px-1 py-1.5">
			<img src="/agentscope.svg" alt="AgentScope" class="h-7 w-7 shrink-0" />
			<span class="hidden text-sm font-semibold text-foreground md:inline">AgentScope</span>
		</div>

		<!-- 导航 -->
		<nav class="flex flex-col gap-1">
			<router-link
				v-for="item in navItems"
				:key="item.to"
				:to="item.to"
				class="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-row-hover hover:text-foreground"
				active-class="!bg-accent !text-foreground font-medium"
				:title="item.label"
			>
				<Icon :icon="item.icon" class="h-5 w-5 shrink-0" />
				<span class="hidden md:inline">{{ item.label }}</span>
			</router-link>
		</nav>

		<div class="flex-1"></div>

		<!-- 深色模式 -->
		<div class="flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground">
			<Icon icon="lucide:moon" class="h-5 w-5 shrink-0" />
			<span class="hidden flex-1 md:inline">深色模式</span>
			<el-switch
				:value="dark"
				@change="onToggleDark"
				class="hidden md:inline-block"
			/>
		</div>

		<!-- 服务器信息 -->
		<div class="hidden border-t border-border pt-2 md:block">
			<div class="truncate px-2 text-xs text-text-tertiary" :title="serverUrl">
				{{ serverUrl }}
			</div>
			<div class="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
				<Icon icon="lucide:user" class="h-3.5 w-3.5" />
				<span class="truncate">{{ username }}</span>
				<router-link to="/setup" class="ml-auto text-primary hover:underline" title="重新设置">
					<Icon icon="lucide:settings" class="h-4 w-4" />
				</router-link>
			</div>
		</div>
	</aside>
</template>

<script>
import { defineComponent } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';

export default defineComponent({
	name: 'AppSidebar',
	components: { Icon },
	data() {
		return {
			// Phase 1 骨架导航；业务页随 Phase 2-4 补入（凭证/知识库/MCP/技能/频道/日程）
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
