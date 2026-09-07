<template>
	<div class="flex h-full items-center justify-center">
		<div class="text-center">
			<Icon icon="lucide:message-square" class="mx-auto mb-4 h-12 w-12 text-text-tertiary" />
			<p class="text-lg font-medium text-foreground">聊天页面</p>
			<p class="mt-2 text-sm text-muted-foreground">
				SSE 聊天链路将在 Phase 4 迁移（useMessages → ASMessageBubble 链路）。
			</p>
		</div>
	</div>
</template>

<script>
import { defineComponent } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';

export default defineComponent({
	name: 'PlaceholderChat',
	components: { Icon },
});
</script>
