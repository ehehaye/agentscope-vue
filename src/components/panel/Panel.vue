<template>
  <div class="flex h-full flex-col overflow-hidden p-2">
    <div class="flex items-center justify-between px-2 py-1">
      <span class="flex items-center gap-1.5 text-sm">
        <Icon v-if="icon" :icon="icon" class="h-4 w-4" />
        <span class="truncate">{{ title }}</span>
      </span>
      <div class="flex items-center gap-1">
        <slot name="actions" />
        <el-button type="text" size="mini" @click="$emit('close')">
          <Icon icon="lucide:x" class="h-4 w-4" />
        </el-button>
      </div>
    </div>
    <div class="flex flex-1 flex-col overflow-auto px-2">
      <slot />
    </div>
  </div>
</template>

<script>
import { defineComponent } from '@vue/composition-api';
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
