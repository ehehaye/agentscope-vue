<template>
  <div
    ref="stripEl"
    class="tw-flex tw-shrink-0 tw-items-stretch tw-gap-2 tw-overflow-x-auto tw-px-4 tw-py-3"
  >
    <button
      v-for="item in steps"
      :key="item.index"
      type="button"
      :data-step-index="item.index"
      :title="[item.definition.subject, item.definition.description].filter(Boolean).join('\n')"
      :disabled="isPending(item)"
      class="tw-flex tw-w-48 tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-px-3 tw-py-2 tw-text-left tw-transition-colors xl:tw-w-56"
      :class="[
        item.index === activeIndex ? 'tw-border-primary tw-bg-muted' : 'tw-border-border',
        isPending(item)
          ? 'tw-cursor-not-allowed tw-opacity-50'
          : 'tw-cursor-pointer hover:tw-border-primary hover:tw-bg-muted',
      ]"
      @click="select(item)"
    >
      <span
        class="tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-secondary tw-text-10px tw-font-medium"
      >
        {{ item.index + 1 }}
      </span>
      <span class="tw-min-w-0 tw-flex-1 tw-truncate tw-text-sm tw-font-medium">{{ item.definition.subject }}</span>
      <StatusBadge
        class="tw-shrink-0"
        :status="item.state.phase || 'pending'"
      />
    </button>
  </div>
</template>

<script>
import { defineComponent, ref, watch, nextTick } from '@/composables/vue';
import StatusBadge from '@/components/badge/StatusBadge.vue';

export default defineComponent({
  name: 'SopStepStrip',
  components: { StatusBadge },
  props: {
    steps: { type: Array, default: () => [] },
    activeIndex: { type: Number, default: 0 },
  },
  emits: ['select'],
  setup(props, { emit }) {
    const stripEl = ref(null);

    function isPending(item) {
      const phase = item.state?.phase;
      return !phase || phase === 'pending';
    }

    function select(item) {
      if (isPending(item)) return;
      emit('select', item.index);
    }

    watch(
      () => props.activeIndex,
      (index) => {
        if (index < 0) return;
        nextTick(() => {
          const el = stripEl.value?.querySelector(`[data-step-index="${index}"]`);
          el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
        });
      },
      { immediate: true },
    );

    return { stripEl, isPending, select };
  },
});
</script>
