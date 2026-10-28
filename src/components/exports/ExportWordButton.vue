<template>
  <el-button
    type="text"
    size="small"
    circle
    :disabled="isDisabled"
    :title="title"
    @click="handleExport"
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

const EMPTY_TIP = '暂无可导出的文字内容';

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

/**
 * 把导出段落渲染成 Word 元素。
 * content 为空的段落只输出标签，用于「会话」这类分隔行。
 * @param {object} builder createDocxBuilder 的返回值
 * @param {{label: string, content: string, format: 'text'|'markdown'}[]} sections
 * @returns {Promise<object[]>} docx 元素列表
 */
async function renderSections(builder, sections) {
  const { docx } = builder;
  const children = [];
  for (const section of sections) {
    children.push(sectionLabel(docx, section.label));
    if (!section.content) continue;
    const blocks =
      section.format === 'text'
        ? plainBlocks(docx, section.content)
        : await builder.markdownBlocks(section.content);
    children.push(...blocks);
  }
  return children;
}

export default defineComponent({
  name: 'ExportWordButton',
  components: { Icon },
  props: {
    /** 本地消息列表，按角色分组后导出；提供 loader 时不使用 */
    msgs: { type: Array, default: () => [] },
    /** 点击时才拉取的导出段落，结构与 buildExportSections 的返回值一致 */
    loader: { type: Function, default: null },
    disabled: { type: Boolean, default: false },
    filename: { type: String, default: '' },
  },
  setup(props) {
    const loading = ref(false);

    /** 本地消息对应的导出段落 */
    const localSections = computed(() => buildExportSections(props.msgs));

    // loader 模式要到点击后才知道有没有内容，因此只判断「能否发起导出」
    const canExport = computed(() => Boolean(props.loader) || localSections.value.length > 0);
    const isDisabled = computed(() => props.disabled || loading.value || !canExport.value);

    const title = computed(() => {
      if (props.disabled) return '导出暂不可用';
      return canExport.value ? '导出为 Word' : EMPTY_TIP;
    });

    /** 取本次要导出的段落：loader 优先，否则用本地消息 */
    async function resolveSections() {
      if (!props.loader) return localSections.value;
      return (await props.loader()) || [];
    }

    /** 点击导出：取段落 → 构建 Word → 下载 */
    async function handleExport() {
      if (isDisabled.value) return;
      loading.value = true;
      try {
        const sections = await resolveSections();
        if (sections.length === 0) {
          toast.info(EMPTY_TIP);
          return;
        }
        const builder = await createDocxBuilder();
        const children = await renderSections(builder, sections);
        await builder.save(children, props.filename || undefined);
      } catch (err) {
        console.error('[ExportWordButton] 导出 Word 失败', err);
        toast.error('导出 Word 失败，详见控制台');
      } finally {
        loading.value = false;
      }
    }

    return { loading, isDisabled, title, handleExport };
  },
});
</script>
