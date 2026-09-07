<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-overflow-hidden tw-p-2">
    <div class="tw-flex tw-items-center tw-justify-between tw-px-2 tw-py-1">
      <span class="tw-flex tw-items-center tw-gap-1.5 tw-text-sm">
        <Icon v-if="icon" :icon="icon" class="tw-h-4 tw-w-4" />
        <span class="tw-truncate">{{ title }}</span>
      </span>
      <div class="tw-flex tw-items-center tw-gap-1">
        <slot name="actions" />
        <el-button type="text" size="mini" @click="$emit('close')">
          <Icon icon="lucide:x" class="tw-h-4 tw-w-4" />
        </el-button>
      </div>
    </div>
    <div class="tw-flex tw-flex-1 tw-flex-col tw-overflow-auto tw-px-2">
      <slot />
    </div>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';

export default defineComponent({
  name: 'Panel',
  components: { Icon },
  props: {
    title: { type: String, required: true },
    icon: { type: String, default: '' },
  },
  emits: ['close'],
});
</script>
