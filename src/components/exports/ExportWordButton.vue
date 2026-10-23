<template>
  <el-button
    type="text"
    size="small"
    circle
    :disabled="isDisabled"
    :title="title"
    @click="trigger"
  >
    <Icon
      :icon="loading ? 'lucide:loader-2' : 'lucide:file-down'"
      class="tw-h-4 tw-w-4"
      :class="{ 'tw-animate-spin': loading }"
    />
  </el-button>
</template>

<script>
import { defineComponent, computed, ref } from '@/composables/vue';
import { createDocxBuilder } from '@/utils/word';
import { buildExportSections } from '@/utils/export';
import { toast } from '@/lib/toast';
import Icon from '@/components/ui/Icon';

// 会话导出专用的展示原语：留在组件内，避免把「角色标签/纯文本段落」
// 这类业务语义带进通用的 word.js
function sectionLabel(docx, label) {
  return new docx.Paragraph({
    spacing: { before: 240, after: 80 },
    children: [new docx.TextRun({ text: label, bold: true, color: '909399', size: 20 })],
  });
}

function plainBlocks(docx, text) {
  const runs = text.split('\n').map((line, index) => new docx.TextRun({ text: line, break: index === 0 ? 0 : 1 }));
  return [new docx.Paragraph({ children: runs, spacing: { after: 120 } })];
}

export default defineComponent({
  name: 'ExportWordButton',
  components: { Icon },
  props: {
    msgs: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false },
    filename: { type: String, default: '' },
  },
  setup(props) {
    const loading = ref(false);
    const sections = computed(() => buildExportSections(props.msgs));
    const isDisabled = computed(() => props.disabled || loading.value || sections.value.length === 0);

    const title = computed(() => {
      if (props.disabled) return '导出暂不可用';
      if (sections.value.length === 0) return '暂无可导出的文字内容';
      return '导出为 Word';
    });

    async function trigger() {
      if (isDisabled.value) return;
      loading.value = true;
      try {
        const builder = await createDocxBuilder();
        const { docx } = builder;
        const children = [];
        for (const section of sections.value) {
          children.push(sectionLabel(docx, section.label));
          if (section.format === 'text') children.push(...plainBlocks(docx, section.content));
          else children.push(...(await builder.markdownBlocks(section.content)));
        }
        await builder.save(children, props.filename || undefined);
      } catch (err) {
        console.error('[ExportWordButton] 导出 Word 失败', err);
        toast.error('导出 Word 失败，详见控制台');
      } finally {
        loading.value = false;
      }
    }

    return { loading, isDisabled, title, trigger };
  },
});
</script>
