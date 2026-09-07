<template>
	<span :class="['inline-flex items-center gap-1.5 text-xs font-medium', toneClass]">
		<span :class="['h-1.5 w-1.5 rounded-full', dotClass]" />
		{{ label }}
	</span>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';

const TONE = {
	disabled: 'text-muted-foreground',
	stopped: 'text-muted-foreground',
	connecting: 'text-amber-600',
	retrying: 'text-amber-600',
	connected: 'text-emerald-600',
	failed: 'text-destructive',
};

const DOT = {
	disabled: 'bg-muted-foreground/40',
	stopped: 'bg-muted-foreground/40',
	connecting: 'bg-amber-500',
	retrying: 'bg-amber-500',
	connected: 'bg-emerald-500',
	failed: 'bg-destructive',
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
