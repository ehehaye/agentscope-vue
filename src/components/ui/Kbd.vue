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
	"pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3";

const groupClass = 'inline-flex items-center gap-1';

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
