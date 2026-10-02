<template>
  <Icon
    icon="lucide:loader-2"
    :class="cn('tw-size-4 tw-animate-spin', className)"
    role="status"
    aria-label="加载中"
    v-bind="$attrs"
  />
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export default defineComponent({
  name: 'Spinner',
  components: { Icon },
  props: {
    className: { type: String, default: '' },
  },
  setup() {
    return { cn };
  },
});
</script>
