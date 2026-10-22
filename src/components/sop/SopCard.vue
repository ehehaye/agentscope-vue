<template>
  <div
    class="tw-group tw-flex tw-cursor-pointer tw-flex-col tw-gap-1.5 tw-rounded-xl tw-border tw-border-border tw-p-4 tw-transition-colors hover:tw-border-primary hover:tw-bg-muted"
    @click="$emit('open', sop)"
  >
    <div class="tw-flex tw-items-center tw-gap-2">
      <span class="tw-min-w-0 tw-flex-1 tw-truncate tw-text-base tw-font-medium">{{ sop.data.name }}</span>
      <Icon
        icon="lucide:arrow-up-right"
        class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-muted-foreground tw-opacity-0 tw-transition-opacity group-hover:tw-opacity-100"
      />
    </div>
    <p class="tw-truncate tw-text-xs tw-text-muted-foreground">
      {{ sop.data.description || '暂无描述' }}
    </p>
    <div
      class="tw-mt-auto tw-flex tw-flex-wrap tw-items-center tw-gap-x-3 tw-gap-y-1 tw-pt-2 tw-text-10px tw-text-muted-foreground"
    >
      <span>{{ (sop.data.steps || []).length }} 个步骤</span>
      <span>{{ grainLabel }}</span>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import Icon from '@/components/ui/Icon';
import { SOP_WORKSPACE_GRAIN_LABELS } from '@/utils/sop';

export default defineComponent({
  name: 'SopCard',
  components: { Icon },
  props: {
    sop: { type: Object, required: true },
  },
  emits: ['open'],
  setup(props) {
    const grainLabel = computed(
      () => SOP_WORKSPACE_GRAIN_LABELS[props.sop?.data?.workspace_grain] || '整个运行共用一个工作区',
    );

    return { grainLabel };
  },
});
</script>
