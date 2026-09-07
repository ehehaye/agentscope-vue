<template>
	<Icon icon="lucide:loader-2" :class="cn('size-4 animate-spin', className)" role="status" aria-label="Loading" v-bind="$attrs" />
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { cn } from '@/lib/utils';

export default defineComponent({
	name: 'Spinner',
	components: { Icon },
	props: {
		className: { type: String, default: '' },
	},
	setup() {
		return { cn };
	},
});
</script>
