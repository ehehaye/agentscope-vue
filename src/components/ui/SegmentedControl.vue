<template>
  <div
    data-slot="segmented-control"
    role="tablist"
    :class="cn('tw-inline-flex tw-items-center tw-gap-0.5 tw-rounded-lg tw-bg-muted tw-p-0.5', className)"
  >
    <button
      v-for="item in options"
      :key="item.value"
      type="button"
      role="tab"
      :aria-selected="value === item.value"
      :disabled="item.disabled"
      :class="itemClass(item)"
      @click="select(item)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { cn } from '@/lib/utils';

const itemBase =
  'tw-rounded-md tw-px-3 tw-py-2 tw-text-xs tw-outline-none tw-transition-colors disabled:tw-pointer-events-none disabled:tw-opacity-50';

export default defineComponent({
  name: 'SegmentedControl',
  model: { prop: 'value', event: 'input' },
  props: {
    className: { type: String, default: '' },
    value: { type: String, default: '' },
    options: { type: Array, default: () => [] },
  },
  setup(props, { emit }) {
    function itemClass(item) {
      return cn(
        itemBase,
        item.value === props.value
          ? 'tw-bg-card tw-font-medium tw-text-foreground tw-shadow-sm'
          : 'tw-text-muted-foreground hover:tw-text-foreground',
      );
    }

    function select(item) {
      if (item.disabled || item.value === props.value) return;
      emit('input', item.value);
    }

    return { cn, itemClass, select };
  },
});
</script>
