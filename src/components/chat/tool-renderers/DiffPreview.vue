<template>
  <div class="overflow-x-auto">
    <pre class="font-mono text-xs leading-5 whitespace-pre">{{ visibleDiff }}</pre>
    <el-button
      v-if="shouldTruncate"
      type="text"
      size="mini"
      class="mt-1 w-full"
      @click="expanded = !expanded"
    >
      {{ expanded ? '收起' : `展开 ${hiddenLines} 行` }}
    </el-button>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';

const MAX_LINES = 18;

export default defineComponent({
  name: 'DiffPreview',
  props: {
    unifiedDiff: { type: String, required: true },
  },
  setup(props) {
    const expanded = ref(false);
    const lines = computed(() => props.unifiedDiff.split('\n'));
    const shouldTruncate = computed(() => lines.value.length > MAX_LINES);
    const visibleDiff = computed(() => {
      if (expanded.value || !shouldTruncate.value) return props.unifiedDiff;
      return lines.value.slice(0, MAX_LINES).join('\n');
    });
    const hiddenLines = computed(() => Math.max(0, lines.value.length - MAX_LINES));

    return { expanded, visibleDiff, shouldTruncate, hiddenLines };
  },
});
</script>
