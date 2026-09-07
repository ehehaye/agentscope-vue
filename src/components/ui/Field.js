import { defineComponent, h, computed } from '@vue/composition-api';
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
				class: cn('flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3', this.className),
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
				class: cn('mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base', this.className),
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
					'group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
					this.className,
				),
			},
			this.$slots.default,
		);
	},
});

const fieldClass = 'group/field flex w-full gap-2 data-[invalid=true]:text-destructive';

const fieldOrientations = {
	vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
	horizontal:
		'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
	responsive:
		'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
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
				class: cn('group/field-content flex flex-1 flex-col gap-0.5 leading-snug', this.className),
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
						'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10',
						'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
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
					'flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50',
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
					'text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5',
					'last:mt-0 nth-last-2:-mt-1',
					'[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
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
				class: cn('relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2', this.className),
			},
			[
				h('el-divider', { class: 'absolute inset-0 top-1/2' }),
				hasContent
					? h(
							'span',
							{
								attrs: { 'data-slot': 'field-separator-content' },
								class: 'relative mx-auto block w-fit bg-background px-2 text-muted-foreground',
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
				{ class: 'ml-4 flex list-disc flex-col gap-1' },
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
				class: cn('text-sm font-normal text-destructive', this.className),
			},
			[this.content],
		);
	},
});
