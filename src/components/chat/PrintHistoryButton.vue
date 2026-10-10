<template>
  <div>
    <el-button
      type="text"
      size="small"
      circle
      :disabled="disabled"
      :title="disabled ? '打印暂不可用' : '打印历史消息'"
      @click="trigger"
    >
      <Icon
        icon="lucide:printer"
        class="tw-h-4 tw-w-4"
      />
    </el-button>
    <button
      v-show="false"
      v-print="printOptions"
      ref="print"
    ></button>
  </div>
</template>

<script>
import print from 'vue-print-nb';
import { defineComponent, watch, ref, nextTick } from '@/composables/vue';
import { Icon } from '@/components/ui/Icon';

// vue-print-nb 会把目标节点克隆进一个全新的 iframe 再打印，iframe 的 <html> 不携带宿主页面的 class，
// 所以打印相关的规则只能通过 extraHead 注入到该 iframe 的 <head> 里。
// 注意：extraHead 内部会按逗号切分字符串，所以规则里不能出现逗号。
const buildExtraHead = ({ target, colorAdjust }) => {
  if (!colorAdjust) return '';
  return `<style>${target}{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}</style>`;
};

export default defineComponent({
  name: 'PrintHistoryButton',
  directives: { print },
  components: { Icon },
  props: {
    target: { type: String, required: true },
    title: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    // 是否强制按原样打印颜色（背景色/背景图），默认开启
    colorAdjust: { type: Boolean, default: true },
  },
  setup(props) {
    // v-print 指令的 binding 只在 bind 时捕获一次，依赖变化不会回传新对象，
    // 因此这里用一个稳定引用的对象承载参数，点击打印时读取到的始终是当前值。
    const printOptions = {
      id: props.target,
      // popTitle 会写入打印 iframe 的 <title>，也是 Chrome 打印对话框「另存为 PDF」时的默认文件名来源。
      popTitle: props.title || document.title,
      extraHead: buildExtraHead(props),
      // 设为 true 启用调试模式，与实际场景略有偏差，比如没有 @media print 样式
      preview: false,
      closeCallback() {
        window.dispatchEvent(new Event('afterprint'));
      },
    };

    watch(
      () => props.colorAdjust,
      () => {
        printOptions.extraHead = buildExtraHead(props);
      },
    );

    const print = ref(null);
    const trigger = async () => {
      // 打印前可能需要更新数据、调整打印样式，这些 DOM 变更要在打印窗口弹出前完成。
      // vue-print-nb 未提供异步回调，因此先派发 beforeprint，再用 nextTick 等待 DOM 更新后再触发打印。
      window.dispatchEvent(new Event('beforeprint'));
      await nextTick();
      print.value?.click();
    };

    return { printOptions, print, trigger };
  },
});
</script>

<style lang="less">
@media print {
  /* 打印目标：纸面铺满、调整气泡字号 */
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
    .time-marker,
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
