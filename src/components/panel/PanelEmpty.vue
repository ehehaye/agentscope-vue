<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-6 text-center">
    <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
      <Icon :icon="icon" class="h-4 w-4" />
    </div>
    <div class="flex max-w-sm flex-col items-center gap-2">
      <div class="text-sm font-medium">{{ title }}</div>
      <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>

<script>
import { defineComponent } from '@vue/composition-api';
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
