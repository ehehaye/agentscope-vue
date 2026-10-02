<template>
  <el-button
    v-print="printOptions"
    type="text"
    size="small"
    circle
    :disabled="disabled"
    :title="disabled ? '暂无历史消息可打印' : '打印历史消息'"
  >
    <Icon
      icon="lucide:printer"
      class="tw-h-4 tw-w-4"
    />
  </el-button>
</template>

<script>
import Vue from 'vue';
import print from 'vue-print-nb';
import { computed, defineComponent } from '@/composables/vue';
import { Icon } from '@/components/iconify/index';

export default defineComponent({
  name: 'PrintHistoryButton',
  directives: { print },
  components: { Icon },
  props: {
    target: { type: String, required: true },
    title: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    // v-print 接受对象形式时可传入 id / popTitle 等；popTitle 会写入打印 iframe 的 <title>，
    // 也是 Chrome 打印对话框「另存为 PDF」时的默认文件名来源。
    const printOptions = computed(() => ({ id: props.target, popTitle: props.title || document.title }));
    return { printOptions };
  },
});
</script>

<style lang="less">
@media print {
  /* 打印目标：纸面铺满、关闭深色背景与外框、调整气泡字号 */
  #as-chat-history {
    display: block !important;
    width: 100% !important;
    max-width: none !important;
    padding: 0 !important;
    margin: 0 !important;
    color: #000 !important;
    background: #fff !important;
    font-size: 12pt;
    line-height: 1.6;
  }

  // 隐藏消息底部工具栏（时间戳、计时徽章、token 统计、音频控件、复制按钮），打印无意义
  #as-chat-history {
    .as-message-toolbar {
      display: none !important;
    }

    // 强制不截断代码块与长串
    pre,
    code {
      white-space: pre-wrap !important;
      word-break: break-word !important;
      background: #f5f5f5 !important;
      color: #111 !important;
      border: 1px solid #ddd !important;
    }

    // 避免消息被分页拆散到两张纸上
    & > div {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }
}
</style>