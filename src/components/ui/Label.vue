<template>
	<label data-slot="label" :class="cn(labelClass, className)">
		<slot />
	</label>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { cn } from '@/lib/utils';

const labelClass =
	'tw-flex tw-items-center tw-gap-2 tw-text-sm tw-leading-none tw-font-medium tw-select-none ' +
	'group-data-[disabled=true]:tw-pointer-events-none group-data-[disabled=true]:tw-opacity-50 ' +
	'peer-disabled:tw-cursor-not-allowed peer-disabled:tw-opacity-50';

export default defineComponent({
	name: 'Label',
	props: {
		className: { type: String, default: '' },
	},
	setup() {
		return { cn, labelClass };
	},
});
</script>
