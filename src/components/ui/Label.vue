<template>
	<label data-slot="label" :class="cn(labelClass, className)">
		<slot />
	</label>
</template>

<script>
import { defineComponent } from '@vue/composition-api';
import { cn } from '@/lib/utils';

const labelClass =
	'flex items-center gap-2 text-sm leading-none font-medium select-none ' +
	'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 ' +
	'peer-disabled:cursor-not-allowed peer-disabled:opacity-50';

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
