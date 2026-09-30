<script>
// 基于 ElScrollbar 扩展：额外监听父元素尺寸变化，尺寸改变时重算滚动条
import ElScrollbar from 'element-ui/lib/scrollbar';
import { addResizeListener, removeResizeListener } from 'element-ui/src/utils/resize-event';

export default {
  name: 'Scrollbar',
  extends: ElScrollbar,
  mounted() {
    if (!this.noresize) {
      addResizeListener(this.$el.parentNode, this.update);
    }
  },
  beforeDestroy() {
    // 移除监听，避免内存泄漏
    if (!this.noresize) {
      removeResizeListener(this.$el.parentNode, this.update);
    }
  },
};
</script>
