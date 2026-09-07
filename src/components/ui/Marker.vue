<template>
	<div
		data-slot="marker"
		:data-variant="variant"
		:class="cn(markerClass, markerVariants[variant] || '', className)"
	>
		<slot />
	</div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { cn } from '@/lib/utils';

const markerClass =
	"tw-group/marker tw-relative tw-flex tw-min-h-4 tw-w-full tw-items-center tw-gap-2 tw-text-left tw-text-sm tw-text-muted-foreground [&_svg:not([class*='size-'])]:tw-size-4 [a]:tw-underline [a]:tw-underline-offset-3 [a]:hover:tw-text-foreground";

const markerVariants = {
	default: '',
	separator:
		'before:tw-mr-1 before:tw-h-px before:tw-min-w-0 before:tw-flex-1 before:tw-bg-border after:tw-ml-1 after:tw-h-px after:tw-min-w-0 after:tw-flex-1 after:tw-bg-border',
	border: 'tw-border-b tw-border-border tw-pb-2',
};

export default defineComponent({
	name: 'Marker',
	props: {
		className: { type: String, default: '' },
		variant: { type: String, default: 'default' },
	},
	setup() {
		return { cn, markerClass, markerVariants };
	},
});
</script>
