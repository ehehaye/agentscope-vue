<template>
  <el-button
    v-print="printOptions"
    type="text"
    size="small"
    circle
    :disabled="disabled"
    :title="disabled ? '打印暂不可用' : '打印历史消息'"
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
import { defineComponent, watch } from '@/composables/vue';
import { Icon } from '@/components/ui/Icon';

// vue-print-nb 会把目标节点克隆进一个全新的 iframe 再打印，iframe 的 <html> 不携带宿主页面的 class，
// 所以打印相关的规则只能通过 extraHead 注入到该 iframe 的 <head> 里。
// 注意：extraHead 内部会按逗号切分字符串，所以规则里不能出现逗号。
const buildExtraHead = ({ target, colorAdjust, hideHeaderFooter }) => {
  let css = '';
  if (colorAdjust) {
    css += `${target}{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}`;
  }
  if (hideHeaderFooter) {
    // 页眉/页脚（底部 URL、日期、页码）由浏览器打印引擎绘制在页边距内，无法用普通 CSS 隐藏。
    // 把 @page 边距设为 0 使其没有绘制空间，再用 body padding 把页边距补回来避免内容贴边被裁切。
    // 注意：URL 与页码同属这一块区域，只能整体去除，无法只隐藏 URL 而保留页码。
    css += '@page{margin:0}body{padding:12mm !important}';
  }
  return css ? `<style>${css}</style>` : '';
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
    // 是否隐藏浏览器打印自带的页眉/页脚（底部 URL、日期、页码），默认隐藏
    hideHeaderFooter: { type: Boolean, default: true },
  },
  setup(props) {
    // v-print 指令的 binding 只在 bind 时捕获一次，依赖变化不会回传新对象，
    // 因此这里用一个稳定引用的对象承载参数，点击打印时读取到的始终是当前值。
    const printOptions = {
      id: props.target,
      // popTitle 会写入打印 iframe 的 <title>，也是 Chrome 打印对话框「另存为 PDF」时的默认文件名来源。
      popTitle: props.title || document.title,
      extraHead: buildExtraHead(props),
    };

    watch(
      () => [props.colorAdjust, props.hideHeaderFooter],
      () => {
        printOptions.extraHead = buildExtraHead(props);
      },
    );

    return { printOptions };
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
