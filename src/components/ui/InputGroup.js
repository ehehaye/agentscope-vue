import { defineComponent, h } from '@/composables/vue';
import { cn } from '@/lib/utils';

const inputGroupClass =
	'tw-group/input-group tw-relative tw-flex tw-h-8 tw-w-full tw-min-w-0 tw-items-center tw-rounded-lg tw-border tw-border-input tw-transition-colors tw-outline-none ' +
	'in-data-[slot=combobox-content]:focus-within:tw-border-inherit in-data-[slot=combobox-content]:focus-within:tw-ring-0 ' +
	'has-disabled:bg-input/50 has-disabled:opacity-50 ' +
	'has-[[data-slot=input-group-control]:focus-visible]:tw-border-ring has-[[data-slot=input-group-control]:focus-visible]:tw-ring-3 has-[[data-slot=input-group-control]:focus-visible]:tw-ring-ring/50 ' +
	'has-[[data-slot][aria-invalid=true]]:tw-border-destructive has-[[data-slot][aria-invalid=true]]:tw-ring-3 has-[[data-slot][aria-invalid=true]]:tw-ring-destructive/20 ' +
	'has-[>[data-align=block-end]]:tw-h-auto has-[>[data-align=block-end]]:tw-flex-col has-[>[data-align=block-start]]:tw-h-auto has-[>[data-align=block-start]]:tw-flex-col ' +
	'dark:tw-bg-input/30 dark:has-disabled:tw-bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:tw-ring-destructive/40 ' +
	'has-[>[data-align=block-end]]:[&>input]:tw-pt-3 has-[>[data-align=block-start]]:[&>input]:tw-pb-3 ' +
	'has-[>[data-align=inline-end]]:[&>input]:tw-pr-1.5 has-[>[data-align=inline-start]]:[&>input]:tw-pl-1.5';

export const InputGroup = defineComponent({
	name: 'InputGroup',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{ attrs: { 'data-slot': 'input-group', role: 'group' }, class: cn(inputGroupClass, this.className) },
			this.$slots.default,
		);
	},
});

const addonClass =
	"tw-flex tw-h-auto tw-cursor-text tw-items-center tw-justify-center tw-gap-2 tw-py-1.5 tw-text-sm tw-font-medium tw-text-muted-foreground tw-select-none group-data-[disabled=true]/input-group:tw-opacity-50 [&>kbd]:tw-rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:tw-size-4";

const addonAlign = {
	'tw-inline-start': 'tw-order-first tw-pl-2 has-[>button]:tw-ml-[-0.3rem] has-[>kbd]:tw-ml-[-0.15rem]',
	'tw-inline-end': 'tw-order-last tw-pr-2 has-[>button]:tw-mr-[-0.3rem] has-[>kbd]:tw-mr-[-0.15rem]',
	'tw-block-start':
		'tw-order-first tw-w-full tw-justify-start tw-px-2.5 tw-pt-2 group-has-[>input]/input-group:tw-pt-2 [.border-b]:tw-pb-2',
	'tw-block-end':
		'tw-order-last tw-w-full tw-justify-start tw-px-2.5 tw-pb-2 group-has-[>input]/input-group:tw-pb-2 [.border-t]:tw-pt-2',
};

export const InputGroupAddon = defineComponent({
	name: 'InputGroupAddon',
	props: {
		className: { type: String, default: '' },
		align: { type: String, default: 'tw-inline-start' },
	},
	methods: {
		handleClick(e) {
			if (e.target.closest('button')) return;
			const input = this.$el.parentElement?.querySelector('input,textarea');
			input?.focus();
		},
	},
	render() {
		return h(
			'div',
			{
				attrs: { role: 'group', 'data-slot': 'input-group-addon', 'data-align': this.align },
				class: cn(addonClass, addonAlign[this.align] || addonAlign['tw-inline-start'], this.className),
				on: { click: this.handleClick },
			},
			this.$slots.default,
		);
	},
});

const buttonClass = 'tw-flex tw-items-center tw-gap-2 tw-text-sm tw-shadow-none';

const buttonSizes = {
	xs: "tw-h-6 tw-gap-1 tw-rounded-calc-r-3px tw-px-1.5 [&>svg:not([class*='size-'])]:tw-size-3.5",
	sm: '',
	'icon-xs': 'tw-size-6 tw-rounded-calc-r-3px tw-p-0 has-[>svg]:tw-p-0',
	'icon-sm': 'tw-size-8 tw-p-0 has-[>svg]:tw-p-0',
};

export const InputGroupButton = defineComponent({
	name: 'InputGroupButton',
	props: {
		className: { type: String, default: '' },
		type: { type: String, default: 'button' },
		variant: { type: String, default: 'text' },
		size: { type: String, default: 'xs' },
	},
	render() {
		return h(
			'el-button',
			{
				attrs: { type: this.type, 'data-size': this.size },
				props: { type: this.variant === 'text' ? 'text' : this.variant },
				class: cn(buttonClass, buttonSizes[this.size] || buttonSizes.xs, this.className),
				on: this.$listeners,
			},
			this.$slots.default,
		);
	},
});

export const InputGroupText = defineComponent({
	name: 'InputGroupText',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'span',
			{
				class: cn(
					"tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-muted-foreground [&_svg]:tw-pointer-events-none [&_svg:not([class*='size-'])]:tw-size-4",
					this.className,
				),
			},
			this.$slots.default,
		);
	},
});

const controlClass =
	'tw-flex-1 tw-rounded-none tw-border-0 tw-bg-transparent tw-shadow-none tw-ring-0 focus-visible:tw-ring-0 disabled:tw-bg-transparent aria-invalid:tw-ring-0 dark:tw-bg-transparent dark:disabled:tw-bg-transparent';

const textareaControlClass =
	'tw-flex-1 tw-resize-none tw-rounded-none tw-border-0 tw-bg-transparent tw-py-2 tw-shadow-none tw-ring-0 focus-visible:tw-ring-0 disabled:tw-bg-transparent aria-invalid:tw-ring-0 dark:tw-bg-transparent dark:disabled:tw-bg-transparent';

export const InputGroupInput = defineComponent({
	name: 'InputGroupInput',
	props: {
		className: { type: String, default: '' },
		value: { type: [String, Number], default: '' },
	},
	render() {
		const attrs = {
			'data-slot': 'input-group-control',
		};
		const props = {
			value: this.value,
		};
		const on = {
			...this.$listeners,
			input: (val) => this.$emit('input', val),
		};
		return h('el-input', {
			attrs,
			props,
			class: cn(controlClass, this.className),
			on,
		});
	},
});

export const InputGroupTextarea = defineComponent({
	name: 'InputGroupTextarea',
	props: {
		className: { type: String, default: '' },
		value: { type: [String, Number], default: '' },
	},
	render() {
		return h('el-input', {
			attrs: { 'data-slot': 'input-group-control' },
			props: {
				type: 'textarea',
				value: this.value,
			},
			class: cn(textareaControlClass, this.className),
			on: {
				...this.$listeners,
				input: (val) => this.$emit('input', val),
			},
		});
	},
});
