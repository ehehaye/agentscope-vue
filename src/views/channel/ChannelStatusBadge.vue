<template>
	<span :class="['tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-font-medium', toneClass]">
		<span :class="['tw-h-1.5 tw-w-1.5 tw-rounded-full', dotClass]" />
		{{ label }}
	</span>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';

const TONE = {
	disabled: 'tw-text-muted-foreground',
	stopped: 'tw-text-muted-foreground',
	connecting: 'tw-text-amber-600',
	retrying: 'tw-text-amber-600',
	connected: 'tw-text-emerald-600',
	failed: 'tw-text-destructive',
};

const DOT = {
	disabled: 'tw-bg-muted-foreground/40',
	stopped: 'tw-bg-muted-foreground/40',
	connecting: 'tw-bg-amber-500',
	retrying: 'tw-bg-amber-500',
	connected: 'tw-bg-emerald-500',
	failed: 'tw-bg-destructive',
};

const STATE_LABELS = {
	disabled: '已禁用',
	stopped: '已停止',
	connecting: '连接中',
	retrying: '重连中',
	connected: '已连接',
	failed: '失败',
};

export default defineComponent({
	name: 'ChannelStatusBadge',
	props: {
		enabled: { type: Boolean, default: false },
		status: { type: Object, default: null },
	},
	setup(props) {
		const state = computed(() => (!props.enabled ? 'disabled' : props.status?.state ?? 'connecting'));
		const toneClass = computed(() => TONE[state.value] ?? TONE.disabled);
		const dotClass = computed(() => DOT[state.value] ?? DOT.disabled);
		const label = computed(() => STATE_LABELS[state.value] ?? state.value);
		return { toneClass, dotClass, label };
	},
});
</script>
