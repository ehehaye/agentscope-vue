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
import { defineComponent } from '@vue/composition-api';
import { cn } from '@/lib/utils';

const toggleBase =
	"group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const toggleVariant = {
	default: 'bg-transparent',
	outline: 'border border-input bg-transparent hover:bg-muted',
};

const toggleSize = {
	default:
		'h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
	sm: "h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
	lg: 'h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
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
