import { defineComponent, h, computed } from '@/composables/vue';
import { cn } from '@/lib/utils';
import Label from './Label.vue';

export const FieldSet = defineComponent({
	name: 'FieldSet',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'fieldset',
			{
				attrs: { 'data-slot': 'field-set' },
				class: cn('tw-flex tw-flex-col tw-gap-4 has-[>[data-slot=checkbox-group]]:tw-gap-3 has-[>[data-slot=radio-group]]:tw-gap-3', this.className),
			},
			this.$slots.default,
		);
	},
});

export const FieldLegend = defineComponent({
	name: 'FieldLegend',
	props: {
		className: { type: String, default: '' },
		variant: { type: String, default: 'legend' },
	},
	render() {
		return h(
			'legend',
			{
				attrs: { 'data-slot': 'field-legend', 'data-variant': this.variant },
				class: cn('tw-mb-1.5 tw-font-medium data-[variant=label]:tw-text-sm data-[variant=legend]:tw-text-base', this.className),
			},
			this.$slots.default,
		);
	},
});

export const FieldGroup = defineComponent({
	name: 'FieldGroup',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{
				attrs: { 'data-slot': 'field-group' },
				class: cn(
					'tw-group/field-group tw-@container/field-group tw-flex tw-w-full tw-flex-col tw-gap-5 data-[slot=checkbox-group]:tw-gap-3 *:data-[slot=field-group]:tw-gap-4',
					this.className,
				),
			},
			this.$slots.default,
		);
	},
});

const fieldClass = 'tw-group/field tw-flex tw-w-full tw-gap-2 data-[invalid=true]:tw-text-destructive';

const fieldOrientations = {
	vertical: 'tw-flex-col *:tw-w-full [&>.sr-only]:tw-w-auto',
	horizontal:
		'tw-flex-row tw-items-center has-[>[data-slot=field-content]]:tw-items-start *:data-[slot=field-label]:tw-flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:tw-mt-px',
	responsive:
		'tw-flex-col *:tw-w-full @md/field-group:tw-flex-row @md/field-group:tw-items-center @md/field-group:*:tw-w-auto @md/field-group:has-[>[data-slot=field-content]]:tw-items-start @md/field-group:*:data-[slot=field-label]:tw-flex-auto [&>.sr-only]:tw-w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:tw-mt-px',
};

export const Field = defineComponent({
	name: 'Field',
	props: {
		className: { type: String, default: '' },
		orientation: { type: String, default: 'vertical' },
	},
	render() {
		return h(
			'div',
			{
				attrs: { role: 'group', 'data-slot': 'field', 'data-orientation': this.orientation },
				class: cn(fieldClass, fieldOrientations[this.orientation] || fieldOrientations.vertical, this.className),
			},
			this.$slots.default,
		);
	},
});

export const FieldContent = defineComponent({
	name: 'FieldContent',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{
				attrs: { 'data-slot': 'field-content' },
				class: cn('tw-group/field-content tw-flex tw-flex-1 tw-flex-col tw-gap-0.5 tw-leading-snug', this.className),
			},
			this.$slots.default,
		);
	},
});

export const FieldLabel = defineComponent({
	name: 'FieldLabel',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			Label,
			{
				attrs: { 'data-slot': 'field-label' },
				props: {
					className: cn(
						'tw-group/field-label tw-peer/field-label tw-flex tw-w-fit tw-gap-2 tw-leading-snug group-data-[disabled=true]/field:tw-opacity-50 has-data-checked:tw-border-primary/30 has-data-checked:tw-bg-primary/5 has-[>[data-slot=field]]:tw-rounded-lg has-[>[data-slot=field]]:tw-border *:data-[slot=field]:tw-p-2.5 dark:has-data-checked:tw-border-primary/20 dark:has-data-checked:tw-bg-primary/10',
						'has-[>[data-slot=field]]:tw-w-full has-[>[data-slot=field]]:tw-flex-col',
						this.className,
					),
				},
			},
			this.$slots.default,
		);
	},
});

export const FieldTitle = defineComponent({
	name: 'FieldTitle',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'div',
			{
				attrs: { 'data-slot': 'field-label' },
				class: cn(
					'tw-flex tw-w-fit tw-items-center tw-gap-2 tw-text-sm tw-font-medium group-data-[disabled=true]/field:tw-opacity-50',
					this.className,
				),
			},
			this.$slots.default,
		);
	},
});

export const FieldDescription = defineComponent({
	name: 'FieldDescription',
	props: { className: { type: String, default: '' } },
	render() {
		return h(
			'p',
			{
				attrs: { 'data-slot': 'field-description' },
				class: cn(
					'tw-text-left tw-text-sm tw-leading-normal tw-font-normal tw-text-muted-foreground group-has-data-horizontal/field:tw-text-balance [[data-variant=legend]+&]:tw--mt-1.5',
					'last:tw-mt-0 nth-last-2:tw--mt-1',
					'[&>a]:tw-underline [&>a]:tw-underline-offset-4 [&>a:hover]:tw-text-primary',
					this.className,
				),
			},
			this.$slots.default,
		);
	},
});

export const FieldSeparator = defineComponent({
	name: 'FieldSeparator',
	props: { className: { type: String, default: '' } },
	render() {
		const hasContent = Boolean(this.$slots.default);
		return h(
			'div',
			{
				attrs: { 'data-slot': 'field-separator', 'data-content': hasContent },
				class: cn('tw-relative tw--my-2 tw-h-5 tw-text-sm group-data-[variant=outline]/field-group:tw--mb-2', this.className),
			},
			[
				h('el-divider', { class: 'tw-absolute tw-inset-0 tw-top-1/2' }),
				hasContent
					? h(
							'span',
							{
								attrs: { 'data-slot': 'field-separator-content' },
								class: 'tw-relative tw-mx-auto tw-block tw-w-fit tw-bg-background tw-px-2 tw-text-muted-foreground',
							},
							this.$slots.default,
						)
					: null,
			],
		);
	},
});

export const FieldError = defineComponent({
	name: 'FieldError',
	props: {
		className: { type: String, default: '' },
		errors: { type: Array, default: () => [] },
	},
	setup(props, { slots }) {
		const content = computed(() => {
			if (slots.default) return slots.default;
			if (!props.errors?.length) return null;
			const unique = [];
			const seen = new Set();
			for (const error of props.errors) {
				const msg = error?.message;
				if (msg && !seen.has(msg)) {
					seen.add(msg);
					unique.push(msg);
				}
			}
			if (unique.length === 0) return null;
			if (unique.length === 1) return unique[0];
			return h(
				'ul',
				{ class: 'tw-ml-4 tw-flex tw-list-disc tw-flex-col tw-gap-1' },
				unique.map((msg, index) => h('li', { key: index }, msg)),
			);
		});
		return { content };
	},
	render() {
		if (!this.content) return null;
		return h(
			'div',
			{
				attrs: { role: 'alert', 'data-slot': 'field-error' },
				class: cn('tw-text-sm tw-font-normal tw-text-destructive', this.className),
			},
			[this.content],
		);
	},
});
