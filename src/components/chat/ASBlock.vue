<template>
  <div>
    <template v-if="block.type === 'text'">
      <div
        v-if="plain"
        class="tw-whitespace-pre-wrap tw-break-words"
      >
        {{ block.text }}
      </div>
      <MarkdownRenderer
        v-else
        :content="block.text"
      />
    </template>

    <template v-else-if="block.type === 'thinking'">
      <Collapsible
        trigger-class="tw-text-sm tw-text-muted-foreground"
        :default-open="isThinkingRunning"
      >
        <template #trigger>
          <div
            class="tw-flex tw-items-center tw-gap-2"
            :class="{ shimmer: isThinkingRunning }"
          >
            <span>{{ thinkingTitle }}</span>
          </div>
        </template>
        <div class="tw-mt-2 tw-rounded-md tw-bg-muted tw-p-2 tw-text-sm tw-text-muted-foreground">
          <MarkdownRenderer :content="block.thinking" />
        </div>
      </Collapsible>
    </template>

    <template v-else-if="block.type === 'hint'">
      <Collapsible trigger-class="tw-text-sm tw-text-muted-foreground">
        <template #trigger>
          <div class="tw-flex tw-items-center tw-gap-2">
            <span>{{ hintLabel }}</span>
          </div>
        </template>
        <div class="tw-mt-2 tw-rounded-md tw-bg-muted tw-p-2 tw-text-sm">
          <ASBlock
            v-for="(item, idx) in hintItems"
            :key="idx"
            :block="item"
          />
        </div>
      </Collapsible>
    </template>

    <template v-else-if="block.type === 'data'">
      <DataBlockView :block="block" />
    </template>

    <template v-else-if="block.type === 'tool_call_group'">
      <ToolCallGroup :calls="block.calls" />
    </template>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onUnmounted } from '@/composables/vue';
import MarkdownRenderer from '@/components/md/MarkdownRenderer.vue';
import Collapsible from '@/components/ui/Collapsible.vue';
import DataBlockView from './DataBlockView.vue';
import ToolCallGroup from './ToolCallGroup.vue';

export default defineComponent({
  name: 'ASBlock',
  components: { MarkdownRenderer, Collapsible, DataBlockView, ToolCallGroup },
  props: {
    block: { type: Object, required: true },
    plain: { type: Boolean, default: false },
  },
  setup(props) {
    const isThinkingRunning = computed(() => props.block.type === 'thinking' && !props.block.finished_at);

    const now = ref(Date.now());
    let timer = null;
    watch(
      isThinkingRunning,
      (running) => {
        if (running) {
          now.value = Date.now();
          timer = setInterval(() => {
            now.value = Date.now();
          }, 1000);
        } else if (timer) {
          clearInterval(timer);
          timer = null;
        }
      },
      { immediate: true },
    );
    onUnmounted(() => {
      if (timer) clearInterval(timer);
    });

    const thinkingTitle = computed(() => {
      if (props.block.type !== 'thinking') return '';
      const startMs = new Date(props.block.created_at).getTime();
      const endMs = props.block.finished_at ? new Date(props.block.finished_at).getTime() : now.value;
      const seconds = Math.max(0, (endMs - startMs) / 1000);
      const duration = formatTime(seconds);
      const status = isThinkingRunning.value ? '思考中' : '思考完成';
      const durationText = seconds > 1 ? `（用时${duration}）` : '';
      return `${status}${durationText}`;
    });

    const hintLabel = computed(() => {
      if (props.block.type !== 'hint') return '';
      if (!props.block.source) return '消息';
      try {
        const parsed = JSON.parse(props.block.source);
        const label = parsed.label || props.block.source;
        const sublabel = parsed.sublabel || '';
        return sublabel ? `${label} - ${sublabel}` : label;
      } catch {
        return props.block.source;
      }
    });

    const hintItems = computed(() => {
      if (props.block.type !== 'hint') return [];
      return typeof props.block.hint === 'string'
        ? [
            {
              type: 'text',
              id: `${props.block.id}-text`,
              text: props.block.hint,
              created_at: props.block.created_at,
            },
          ]
        : props.block.hint || [];
    });

    return {
      isThinkingRunning,
      thinkingTitle,
      hintLabel,
      hintItems,
    };
  },
});

function formatTime(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}
</script>
