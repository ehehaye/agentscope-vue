<template>
	<div
		class="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-sm font-semibold"
		:style="style"
	>
		<img v-if="type?.icon_url" :src="type.icon_url" :alt="label" class="h-full w-full object-cover" />
		<span v-else>{{ initial }}</span>
	</div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { avatarTint } from '@/utils/common';

export default defineComponent({
	name: 'TypeAvatar',
	props: {
		type: { type: Object, default: null },
	},
	setup(props) {
		const seed = computed(() => props.type?.channel_type ?? '');
		const label = computed(() => props.type?.display_name ?? seed.value);
		const initial = computed(() => label.value.slice(0, 1).toUpperCase());
		const style = computed(() => avatarTint(seed.value));
		return { label, initial, style };
	},
});
</script>
