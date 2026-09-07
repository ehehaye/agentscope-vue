<template>
	<component
		:is="group ? 'div' : 'kbd'"
		:data-slot="group ? 'kbd-group' : 'kbd'"
		:class="group ? cn(groupClass, className) : cn(kbdClass, className)"
	>
		<slot />
	</component>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { cn } from '@/lib/utils';

const kbdClass =
	"tw-pointer-events-none tw-inline-flex tw-h-5 tw-w-fit tw-min-w-5 tw-items-center tw-justify-center tw-gap-1 tw-rounded-sm tw-bg-muted tw-px-1 tw-font-sans tw-text-xs tw-font-medium tw-text-muted-foreground tw-select-none in-data-[slot=tooltip-content]:tw-bg-background/20 in-data-[slot=tooltip-content]:tw-text-background dark:in-data-[slot=tooltip-content]:tw-bg-background/10 [&_svg:not([class*='size-'])]:tw-size-3";

const groupClass = 'tw-inline-flex tw-items-center tw-gap-1';

export default defineComponent({
	name: 'Kbd',
	props: {
		className: { type: String, default: '' },
		group: { type: Boolean, default: false },
	},
	setup() {
		return { cn, kbdClass, groupClass };
	},
});
</script>
