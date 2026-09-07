import { defineComponent, h } from '@/composables/vue';
import { cn } from '@/lib/utils';

const itemGroupClass =
	'tw-group/item-group tw-flex tw-w-full tw-flex-col tw-gap-4 has-data-[size=sm]:tw-gap-2.5 has-data-[size=xs]:tw-gap-2';

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
			class: cn('tw-my-2', this.className),
		});
	},
});

const itemClass =
	'tw-group/item tw-flex tw-w-full tw-flex-wrap tw-items-center tw-rounded-lg tw-border tw-text-sm tw-transition-colors tw-duration-100 tw-outline-none focus-visible:tw-border-ring tw-focus-ring-3px [a]:tw-transition-colors [a]:hover:tw-bg-muted';

const itemVariants = {
	default: 'tw-border-transparent',
	outline: 'tw-border-border',
	muted: 'tw-border-transparent tw-bg-muted/50',
};

const itemSizes = {
	default: 'tw-gap-2.5 tw-px-3 tw-py-2.5',
	sm: 'tw-gap-2.5 tw-px-3 tw-py-2.5',
	xs: 'tw-gap-2 tw-px-2.5 tw-py-2 in-data-[slot=dropdown-menu-content]:tw-p-0',
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
	'tw-flex tw-shrink-0 tw-items-center tw-justify-center tw-gap-2 group-has-data-[slot=item-description]/item:tw-translate-y-0.5 group-has-data-[slot=item-description]/item:tw-self-start [&_svg]:tw-pointer-events-none';

const itemMediaVariants = {
	default: 'tw-bg-transparent',
	icon: "[&_svg:not([class*='size-'])]:tw-size-4",
	image:
		'tw-size-10 tw-overflow-hidden tw-rounded-sm group-data-[size=sm]/item:tw-size-8 group-data-[size=xs]/item:tw-size-6 [&_img]:tw-size-full [&_img]:tw-object-cover',
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
					'tw-flex tw-flex-1 tw-flex-col tw-gap-1 group-data-[size=xs]/item:tw-gap-0 [&+[data-slot=item-content]]:tw-flex-none',
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
				class: cn('tw-line-clamp-1 tw-flex tw-w-fit tw-items-center tw-gap-2 tw-text-sm tw-leading-snug tw-font-medium tw-underline-offset-4', this.className),
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
					'tw-line-clamp-2 tw-text-left tw-text-sm tw-leading-normal tw-font-normal tw-text-muted-foreground group-data-[size=xs]/item:tw-text-xs [&>a]:tw-underline [&>a]:tw-underline-offset-4 [&>a:hover]:tw-text-primary',
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
			{ attrs: { 'data-slot': 'item-actions' }, class: cn('tw-flex tw-items-center tw-gap-2', this.className) },
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
				class: cn('tw-flex tw-basis-full tw-items-center tw-justify-between tw-gap-2', this.className),
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
				class: cn('tw-flex tw-basis-full tw-items-center tw-justify-between tw-gap-2', this.className),
			},
			this.$slots.default,
		);
	},
});
