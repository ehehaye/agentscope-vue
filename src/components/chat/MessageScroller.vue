<template>
  <div class="tw-relative tw-min-h-0 tw-flex-1">
    <el-scrollbar
      ref="scrollerRef"
      class="tw-h-full tw-w-full tw-overflow-x-hidden"
      wrap-class="tw-overflow-x-hidden"
      view-class="tw-flex tw-min-h-full tw-flex-col tw-gap-6 tw-p-4"
    >
      <slot />
    </el-scrollbar>
    <!-- 用户上翻阅读历史时才出现的「回到底部」浮层按钮 -->
    <el-button
      v-if="showScrollButton"
      type="default"
      size="mini"
      circle
      class="tw-absolute tw-bottom-4 tw-left-1/2 tw--translate-x-1/2"
      @click="scrollToBottom"
    >
      <Icon
        icon="lucide:arrow-down"
        class="tw-h-4 tw-w-4"
      />
    </el-button>
  </div>
</template>

<script>
import { defineComponent, ref, watch, nextTick, onMounted, onUnmounted } from '@/composables/vue';
import { Icon } from '@/components/iconify/index';

/**
 * MessageScroller —— 聊天消息区的自动滚动容器。
 *
 * 职责：在消息内容持续变化时，把视口「钉」在最底部，同时不打断用户向上翻看历史。
 *
 * 两类行为：
 *  1) 自动滚底：内容变化时，若用户未主动上翻，则滚到最底（尊重 autoScroll 开关）。
 *  2) 手动回底：用户上翻后出现浮层按钮，点击立即回到底部。
 *
 * 三个触发源（覆盖不同层的「内容变多」）：
 *  - itemsLength 变化 → 新消息出现（消息数量增加）
 *  - MutationObserver → 同一消息内部内容增长（流式 token、tool_call 块追加等）
 *  - ResizeObserver   → 容器尺寸变化（底部卡片推挤等）
 */
export default defineComponent({
  name: 'MessageScroller',
  components: { Icon },
  props: {
    /** 是否开启自动滚动；关闭后仅在用户点击按钮时回到底部 */
    autoScroll: { type: Boolean, default: true },
    /** 消息条数，用于感知「新消息出现」 */
    itemsLength: { type: Number, default: 0 },
  },
  setup(props) {
    // 模板 ref，指向 el-scrollbar 组件实例（通过它拿到内部的 wrap / view 元素）
    const scrollerRef = ref(null);
    // 控制「回到底部」按钮显隐
    const showScrollButton = ref(false);

    // 用户是否主动上翻：true 时内容增长不强制拉底，避免打断历史阅读
    let userScrolledUp = false;
    // 缓存 el-scrollbar 内部的滚动容器（真正产生 scroll 事件的元素）：
    // 滚动监听与尺寸监听都挂在此元素上
    let wrapEl = null;
    // el-scrollbar 内部的内容容器：观察其子树变化以捕获内容增长
    let viewEl = null;
    // 观察容器尺寸变化（wrap）
    let resizeObserver = null;
    // 观察内容子树变化（view）
    let mutationObserver = null;
    // scheduleScrollToBottom 的 rAF 句柄，用于把同帧内多次触发合并成一次滚动
    let scrollRafId = null;

    // 是否已滚动到「接近底部」（阈值 80px）：
    // 用一个范围而非精确相等，规避亚像素/舍入误差导致的误判
    function isNearBottom() {
      if (!wrapEl) return true;
      return wrapEl.scrollHeight - wrapEl.scrollTop - wrapEl.clientHeight < 80;
    }

    // 同步滚到底：写入 scrollTop 的同时，清掉上翻标记并隐藏浮层按钮
    function scrollToBottom() {
      if (!wrapEl) return;
      wrapEl.scrollTop = wrapEl.scrollHeight;
      userScrolledUp = false;
      showScrollButton.value = false;
    }

    // 节流滚底：流式输出时内容会高频变化，用 rAF 把同一帧内的多次调用
    // 合并成一次滚动，避免每来一个 token 就写一次 scrollTop。
    // 未开启自动滚动、或用户已上翻时直接跳过。
    function scheduleScrollToBottom() {
      if (scrollRafId !== null) return;
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = null;
        if (!props.autoScroll || userScrolledUp) return;
        scrollToBottom();
      });
    }

    // 用户滚动时刷新「上翻」标记与浮层按钮显隐
    function onScroll() {
      if (!wrapEl) return;
      const nearBottom = isNearBottom();
      userScrolledUp = !nearBottom;
      showScrollButton.value = userScrolledUp;
    }

    // 触发源一：消息数量变化（新消息出现）→ 强制拉到底，不管用户是否在往上翻。
    // nextTick 等 Vue 把新消息的 DOM 渲染完成后再滚动，避免滚到旧高度。
    watch(
      () => props.itemsLength,
      (newVal, oldVal) => {
        if (!props.autoScroll) return;
        if (newVal <= oldVal) return;
        nextTick(() => {
          scrollToBottom();
        });
      },
    );

    // el-scrollbar 不对外暴露 @scroll，滚动监听与尺寸监听需手动绑定到内部 wrap
    // 内容增长（流式 token / tool_call 块追加 / 图片加载等）通过 MutationObserver 捕获
    // 容器高度变化（如底部卡片推挤）通过 ResizeObserver 捕获
    onMounted(() => {
      const sb = scrollerRef.value;
      if (!sb) return;
      wrapEl = sb.$refs.wrap;
      viewEl = sb.$refs.resize;
      if (!wrapEl) return;
      // 手动绑定滚动监听（passive 提升滚动性能，无需阻止默认行为）
      wrapEl.addEventListener('scroll', onScroll, { passive: true });
      // 触发源三：容器尺寸变化，未上翻时同步滚到底
      resizeObserver = new ResizeObserver(() => {
        if (!props.autoScroll || userScrolledUp) return;
        scrollToBottom();
      });
      resizeObserver.observe(wrapEl);
      // 触发源二：内容子树变化，节流滚到底
      if (viewEl) {
        mutationObserver = new MutationObserver(() => {
          scheduleScrollToBottom();
        });
        mutationObserver.observe(viewEl, {
          subtree: true,
          childList: true,
          characterData: true,
        });
      }
    });
    // 卸载时统一解绑事件与观察器，并取消未执行的 rAF，防止内存泄漏
    onUnmounted(() => {
      if (wrapEl) {
        wrapEl.removeEventListener('scroll', onScroll);
        wrapEl = null;
      }
      viewEl = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
      mutationObserver?.disconnect();
      mutationObserver = null;
      if (scrollRafId !== null) {
        cancelAnimationFrame(scrollRafId);
        scrollRafId = null;
      }
    });

    return { scrollerRef, showScrollButton, onScroll, scrollToBottom };
  },
});
</script>
