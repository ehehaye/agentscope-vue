<template>
  <div
    class="tw-flex tw-w-full"
    :class="isUser ? 'tw-justify-end' : 'tw-justify-start'"
    :data-role="message.role"
  >
    <div class="tw-flex tw-max-w-85pct tw-flex-col tw-gap-1">
      <div class="tw-flex tw-flex-col tw-gap-2">
        <template v-for="(block, index) in blocks">
          <Bubble v-if="block.type !== 'data'" :key="index" :variant="isUser ? 'muted' : 'ghost'">
            <ASBlock :block="block" />
          </Bubble>
        </template>

        <div v-if="message.finished_reason === 'error'" class="tw-rounded-md tw-border tw-border-red-200 tw-bg-red-50 tw-p-3 tw-text-sm tw-text-red-900 dark:tw-border-red-900 dark:tw-bg-red-950 dark:tw-text-red-50">
          <div class="tw-flex tw-items-center tw-gap-2 tw-font-medium">
            <Icon icon="lucide:triangle-alert" class="tw-h-4 tw-w-4" />
            {{ TEXT.errorTitle }}
          </div>
          <p class="tw-mt-1 tw-text-xs">{{ message.error?.message || TEXT.errorUnknown }}</p>
        </div>
      </div>

      <div v-if="dataBlocks.length > 0" class="tw-flex tw-flex-wrap tw-gap-2">
        <ASBlock v-for="(block, index) in dataBlocks" :key="`data-${index}`" :block="block" />
      </div>

      <div v-if="!isUser" class="tw-flex tw-items-center tw-gap-1">
        <Badge v-if="elapsedText" class="tw-font-mono">
          <Icon v-if="isRunning" icon="lucide:loader-2" class="tw-h-3 tw-w-3 tw-animate-spin" />
          <Icon v-else icon="lucide:check-circle" class="tw-h-3 tw-w-3" />
          <span class="tw-tabular-nums">{{ elapsedText }}</span>
          <template v-if="hasUsage">
            <Icon icon="lucide:arrow-up" class="tw-ml-1 tw-h-3 tw-w-3" />
            <span class="tw-tabular-nums">{{ formatNumber(message.usage?.input_tokens || 0) }}</span>
            <Icon icon="lucide:arrow-down" class="tw-ml-1 tw-h-3 tw-w-3" />
            <span class="tw-tabular-nums">{{ formatNumber(message.usage?.output_tokens || 0) }}</span>
          </template>
          <AudioInlineControl v-for="ab in audioBlocks" :key="ab.id" :block="ab" />
        </Badge>
        <el-button v-if="plainText" type="text" size="mini" @click="copyText">
          <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" class="tw-h-3 tw-w-3" />
        </el-button>
      </div>
      <div v-else-if="plainText" class="tw-flex tw-justify-end">
        <el-button type="text" size="mini" @click="copyText">
          <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" class="tw-h-3 tw-w-3" />
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onUnmounted } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { copyToClipboard, formatNumber, formatTime } from '@/utils/common';
import { TEXT } from './text';
import Bubble from '@/components/ui/Bubble.vue';
import Badge from '@/components/ui/Badge.vue';
import ASBlock from './ASBlock.vue';
import AudioInlineControl from './AudioInlineControl.vue';

export default defineComponent({
  name: 'ASMessageBubble',
  components: { Icon, Bubble, Badge, ASBlock, AudioInlineControl },
  props: {
    message: { type: Object, required: true },
  },
  setup(props) {
    // role 在消息生命周期内不变，但 finished_at 会随 REPLY_END 变化，
    // 必须是 computed——setup 只执行一次，静态取值会让计时器永不停止。
    const isUser = computed(() => props.message.role === 'user');
    const isRunning = computed(() => !props.message.finished_at);
    const now = ref(Date.now());
    let timer = null;

    watch(
      isRunning,
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

    const startMs = new Date(props.message.created_at).getTime();
    const elapsedText = computed(() => {
      const endMs = isRunning.value ? now.value : new Date(props.message.finished_at).getTime();
      return formatTime(Math.max(0, (endMs - startMs) / 1000));
    });

    const hasUsage = computed(
      () =>
        props.message.usage &&
        ((props.message.usage.input_tokens || 0) > 0 ||
          (props.message.usage.output_tokens || 0) > 0),
    );

    const plainText = computed(() =>
      props.message.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n\n'),
    );

    const copied = ref(false);
    async function copyText() {
      if (!(await copyToClipboard(plainText.value))) return;
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    }

    function groupToolCalls(content) {
      const callMap = new Map();
      const orphanResults = [];
      const ordering = [];

      for (const block of content) {
        if (block.type === 'tool_call') {
          callMap.set(block.id, { call: block });
          ordering.push({ type: 'tool', id: block.id });
        } else if (block.type === 'tool_result') {
          const matching = callMap.get(block.id);
          if (matching) matching.result = block;
          else orphanResults.push(block);
        } else {
          ordering.push({ type: 'other', block });
        }
      }

      const result = [];
      let current = [];
      function flush() {
        if (current.length === 0) return;
        result.push({ type: 'tool_call_group', calls: current });
        current = [];
      }

      for (const item of ordering) {
        if (item.type === 'other') {
          flush();
          result.push(item.block);
        } else {
          const entry = callMap.get(item.id);
          if (entry) current.push(entry);
        }
      }
      flush();

      for (const block of orphanResults) {
        result.push({
          type: 'tool_call_group',
          calls: [
            {
              call: {
                type: 'tool_call',
                id: block.id,
                name: block.name,
                input: '',
                state: 'finished',
                created_at: block.created_at,
                finished_at: block.finished_at,
              },
              result: block,
            },
          ],
        });
      }

      return result;
    }

    const blocks = computed(() => groupToolCalls(props.message.content).filter((b) => b.type !== 'data'));
    const dataBlocks = computed(() => props.message.content.filter((b) => b.type === 'data'));
    const audioBlocks = computed(
      () => dataBlocks.value.filter((b) => b.source?.media_type?.startsWith('audio/')),
    );

    return {
      isUser,
      isRunning,
      elapsedText,
      hasUsage,
      plainText,
      copied,
      copyText,
      blocks,
      dataBlocks,
      audioBlocks,
      TEXT,
      formatNumber,
    };
  },
});
</script>
