import { defineComponent, h } from '@/composables/vue';
import { cn } from '@/lib/utils';

const itemGroupClass =
	'group/item-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2';

export const ItemGroup = defineComponent({
	name: 'ItemGroup',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{ attrs: { role: 'list', 'data-slot': 'item-group' }, class: cn(itemGroupClass, this.className) },
			this.$slots.default,
		);
	},
});

export const ItemSeparator = defineComponent({
	name: 'ItemSeparator',
	props: { className: { type: String, default: '' } },
	render() {
		return h('el-divider', {
			attrs: { 'data-slot': 'item-separator' },
			class: cn('my-2', this.className),
		});
	},
});

const itemClass =
	'group/item flex w-full flex-wrap items-center rounded-lg border text-sm transition-colors duration-100 outline-none focus-visible:border-ring tw-focus-ring-3px [a]:transition-colors [a]:hover:bg-muted';

const itemVariants = {
	default: 'border-transparent',
	outline: 'border-border',
	muted: 'border-transparent bg-muted/50',
};

const itemSizes = {
	default: 'gap-2.5 px-3 py-2.5',
	sm: 'gap-2.5 px-3 py-2.5',
	xs: 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
};

export const Item = defineComponent({
	name: 'Item',
	props: {
		className: { type: String, default: '' },
		variant: { type: String, default: 'default' },
		size: { type: String, default: 'default' },
	},
	render() {
		return h(
			'div',
			{
				attrs: {
					'data-slot': 'item',
					'data-variant': this.variant,
					'data-size': this.size,
				},
				class: cn(itemClass, itemVariants[this.variant] || itemVariants.default, itemSizes[this.size] || itemSizes.default, this.className),
			},
			this.$slots.default,
		);
	},
});

const itemMediaClass =
	'flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none';

const itemMediaVariants = {
	default: 'bg-transparent',
	icon: "[&_svg:not([class*='size-'])]:size-4",
	image:
		'size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
};

export const ItemMedia = defineComponent({
	name: 'ItemMedia',
	props: {
		className: { type: String, default: '' },
		variant: { type: String, default: 'default' },
	},
	render() {
		return h(
			'div',
			{
				attrs: { 'data-slot': 'item-media', 'data-variant': this.variant },
				class: cn(itemMediaClass, itemMediaVariants[this.variant] || itemMediaVariants.default, this.className),
			},
			this.$slots.default,
		);
	},
});

export const ItemContent = defineComponent({
	name: 'ItemContent',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{
				attrs: { 'data-slot': 'item-content' },
				class: cn(
					'flex flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none',
					this.className,
				),
			},
			this.$slots.default,
		);
	},
});

export const ItemTitle = defineComponent({
	name: 'ItemTitle',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{
				attrs: { 'data-slot': 'item-title' },
				class: cn('line-clamp-1 flex w-fit items-center gap-2 text-sm leading-snug font-medium underline-offset-4', this.className),
			},
			this.$slots.default,
		);
	},
});

export const ItemDescription = defineComponent({
	name: 'ItemDescription',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'p',
			{
				attrs: { 'data-slot': 'item-description' },
				class: cn(
					'line-clamp-2 text-left text-sm leading-normal font-normal text-muted-foreground group-data-[size=xs]/item:text-xs [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
					this.className,
				),
			},
			this.$slots.default,
		);
	},
});

export const ItemActions = defineComponent({
	name: 'ItemActions',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{ attrs: { 'data-slot': 'item-actions' }, class: cn('flex items-center gap-2', this.className) },
			this.$slots.default,
		);
	},
});

export const ItemHeader = defineComponent({
	name: 'ItemHeader',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{
				attrs: { 'data-slot': 'item-header' },
				class: cn('flex basis-full items-center justify-between gap-2', this.className),
			},
			this.$slots.default,
		);
	},
});

export const ItemFooter = defineComponent({
	name: 'ItemFooter',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{
				attrs: { 'data-slot': 'item-footer' },
				class: cn('flex basis-full items-center justify-between gap-2', this.className),
			},
			this.$slots.default,
		);
	},
});
