<template>
	<button
		type="button"
		data-slot="toggle"
		:data-state="pressed ? 'on' : 'off'"
		:aria-pressed="pressed"
		:class="cn(toggleBase, toggleVariant[variant] || toggleVariant.default, toggleSize[size] || toggleSize.default, className)"
		@click="toggle"
		v-bind="$attrs"
	>
		<slot />
	</button>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { cn } from '@/lib/utils';

const toggleBase =
	"tw-group/toggle tw-inline-flex tw-items-center tw-justify-center tw-gap-1 tw-rounded-lg tw-text-sm tw-font-medium tw-whitespace-nowrap tw-transition-all tw-outline-none hover:tw-bg-muted hover:tw-text-foreground focus-visible:tw-border-ring tw-focus-ring-3px disabled:tw-pointer-events-none disabled:tw-opacity-50 aria-invalid:tw-border-destructive aria-invalid:tw-ring-destructive/20 aria-pressed:tw-bg-muted dark:aria-invalid:tw-ring-destructive/40 [&_svg]:tw-pointer-events-none [&_svg]:tw-shrink-0 [&_svg:not([class*='size-'])]:tw-size-4";

const toggleVariant = {
	default: 'tw-bg-transparent',
	outline: 'tw-border tw-border-input tw-bg-transparent hover:tw-bg-muted',
};

const toggleSize = {
	default:
		'tw-h-8 tw-min-w-8 tw-px-2.5 has-data-[icon=inline-end]:tw-pr-2 has-data-[icon=inline-start]:tw-pl-2',
	sm: "tw-h-7 tw-min-w-7 tw-rounded-min-r-md-12px tw-px-2.5 tw-text-0_8rem has-data-[icon=inline-end]:tw-pr-1.5 has-data-[icon=inline-start]:tw-pl-1.5 [&_svg:not([class*='size-'])]:tw-size-3.5",
	lg: 'tw-h-9 tw-min-w-9 tw-px-2.5 has-data-[icon=inline-end]:tw-pr-2 has-data-[icon=inline-start]:tw-pl-2',
};

export default defineComponent({
	name: 'Toggle',
	model: {
		prop: 'value',
		event: 'input',
	},
	props: {
		className: { type: String, default: '' },
		variant: { type: String, default: 'default' },
		size: { type: String, default: 'default' },
		value: { type: Boolean, default: false },
		disabled: { type: Boolean, default: false },
	},
	setup(props, { emit }) {
		const toggle = () => {
			if (props.disabled) return;
			emit('input', !props.value);
		};
		return {
			cn,
			toggleBase,
			toggleVariant,
			toggleSize,
			pressed: () => props.value,
			toggle,
		};
	},
});
</script>
