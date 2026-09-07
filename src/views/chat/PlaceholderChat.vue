<template>
	<div class="tw-flex tw-h-full tw-items-center tw-justify-center">
		<div class="tw-text-center">
			<Icon icon="lucide:message-square" class="tw-mx-auto tw-mb-4 tw-h-12 tw-w-12 tw-text-text-tertiary" />
			<p class="tw-text-lg tw-font-medium tw-text-foreground">聊天页面</p>
			<p class="tw-mt-2 tw-text-sm tw-text-muted-foreground">
				SSE 聊天链路将在 Phase 4 迁移（useMessages → ASMessageBubble 链路）。
			</p>
		</div>
	</div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';

export default defineComponent({
	name: 'PlaceholderChat',
	components: { Icon },
});
</script>
