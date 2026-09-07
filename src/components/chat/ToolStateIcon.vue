<template>
  <Icon
    v-if="state === 'success'"
    icon="lucide:check"
    class="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400"
  />
  <Icon
    v-else-if="state === 'error'"
    icon="lucide:x"
    class="h-3 w-3 shrink-0 text-red-600 dark:text-red-400"
  />
  <Icon
    v-else-if="state === 'interrupted' || state === 'denied'"
    icon="lucide:ban"
    class="h-3 w-3 shrink-0"
  />
  <Icon v-else icon="lucide:loader-circle" class="h-3 w-3 shrink-0 animate-spin" />
</template>

<script>
import { defineComponent } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';

export default defineComponent({
  name: 'ToolStateIcon',
  components: { Icon },
  props: {
    state: { type: String, default: 'running' },
  },
});
</script>
