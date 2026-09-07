<template>
  <div class="tw-flex tw-flex-1 tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-rounded-xl tw-border tw-border-dashed tw-p-6 tw-text-center">
    <div class="tw-flex tw-size-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-muted tw-text-foreground">
      <Icon :icon="icon" class="tw-h-4 tw-w-4" />
    </div>
    <div class="tw-flex tw-max-w-sm tw-flex-col tw-items-center tw-gap-2">
      <div class="tw-text-sm tw-font-medium">{{ title }}</div>
      <p v-if="description" class="tw-text-sm tw-text-muted-foreground">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';

export default defineComponent({
  name: 'PanelEmpty',
  components: { Icon },
  props: {
    icon: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
  },
});
</script>
