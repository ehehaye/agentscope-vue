<template>
	<div
		class="tw-flex tw-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-lg tw-bg-muted tw-text-sm tw-font-semibold"
		:style="style"
	>
		<img v-if="type?.icon_url" :src="type.icon_url" :alt="label" class="tw-h-full tw-w-full tw-object-cover" />
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
