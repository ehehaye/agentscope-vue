import { defineComponent, h } from '@vue/composition-api';
import { cn } from '@/lib/utils';

const inputGroupClass =
	'group/input-group relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input transition-colors outline-none ' +
	'in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 ' +
	'has-disabled:bg-input/50 has-disabled:opacity-50 ' +
	'has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 ' +
	'has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 ' +
	'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col ' +
	'dark:bg-input/30 dark:has-disabled:bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 ' +
	'has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 ' +
	'has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5';

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
	"flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4";

const addonAlign = {
	'inline-start': 'order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]',
	'inline-end': 'order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]',
	'block-start':
		'order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
	'block-end':
		'order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
};

export const InputGroupAddon = defineComponent({
	name: 'InputGroupAddon',
	props: {
		className: { type: String, default: '' },
		align: { type: String, default: 'inline-start' },
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
				class: cn(addonClass, addonAlign[this.align] || addonAlign['inline-start'], this.className),
				on: { click: this.handleClick },
			},
			this.$slots.default,
		);
	},
});

const buttonClass = 'flex items-center gap-2 text-sm shadow-none';

const buttonSizes = {
	xs: "h-6 gap-1 tw-rounded-calc-r-3px px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
	sm: '',
	'icon-xs': 'size-6 tw-rounded-calc-r-3px p-0 has-[>svg]:p-0',
	'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
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
					"flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
					this.className,
				),
			},
			this.$slots.default,
		);
	},
});

const controlClass =
	'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent';

const textareaControlClass =
	'flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent';

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
