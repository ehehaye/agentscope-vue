<template>
  <div
    v-if="successBody"
    class="tw-flex tw-flex-col tw-rounded-sm tw-border tw-bg-background"
  >
    <div
      v-if="filePath"
      class="tw-px-2 tw-py-1 tw-text-xs tw-text-muted-foreground"
    >
      {{ filePath }}
    </div>
    <DiffPreview :unified-diff="diff" />
  </div>
  <DefaultRenderer
    v-else
    :pair="pair"
  />
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { tryGetFilePath, getResultDiff } from '../tool-utils';
import DiffPreview from './DiffPreview.vue';
import DefaultRenderer from './DefaultRenderer.vue';

export default defineComponent({
  name: 'EditRenderer',
  components: { DiffPreview, DefaultRenderer },
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const filePath = computed(() => tryGetFilePath(props.pair.call.input));
    const diff = computed(() => (props.pair.result ? getResultDiff(props.pair.result) || '' : ''));
    // success 且后端附了 unified diff 才走文件预览；
    // 其余（running / error / interrupted / denied / success 无 diff）全部交给
    // DefaultRenderer 兜底，让它处理 running 徽标 / interrupted 边框 / 多模态拍平。
    const successBody = computed(() => !!props.pair.result && props.pair.result.state === 'success' && !!diff.value);
    return { filePath, diff, successBody };
  },
});
</script>
