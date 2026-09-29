<template>
  <transition name="dock-slide">
    <div v-show="normalizedLayout.length > 0" class="tw-h-full">
      <splitpanes class="tw-h-full" @resized="onResized">
        <pane v-for="(column, colIdx) in normalizedLayout" :key="column[0]" :size="columnSize">
          <splitpanes horizontal @resized="onResized">
            <pane
              v-for="key in column"
              :key="key"
              :size="rowSize(column.length)"
              class="tw-rounded-22px tw-bg-card tw-shadow-panel"
            >
              <Panel :title="panels[key]?.title || key" :icon="panels[key]?.icon" @close="close(key)">
                <component
                  :is="panels[key]?.component"
                  v-if="panels[key]?.component"
                  v-bind="panels[key]?.props || {}"
                />
              </Panel>
            </pane>
          </splitpanes>
        </pane>
      </splitpanes>
    </div>
  </transition>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import Panel from './Panel.vue';

export default defineComponent({
  name: 'PanelDock',
  components: { Splitpanes, Pane, Panel },
  props: {
    layout: { type: Array, default: () => [] },
    panels: { type: Object, default: () => ({}) },
  },
  emits: ['close', 'update:layout'],
  setup(props, { emit }) {
    const normalizedLayout = computed(() =>
      props.layout
        .map((column) => (Array.isArray(column) ? column.filter((k) => props.panels[k]) : []))
        .filter((column) => column.length > 0),
    );

    const columnSize = computed(() => (normalizedLayout.value.length > 0 ? 100 / normalizedLayout.value.length : 100));

    function rowSize(count) {
      return count > 0 ? 100 / count : 100;
    }

    function close(key) {
      emit('close', key);
    }

    function onResized() {
      // splitpanes 只负责交互，布局顺序仍由父组件通过 layout 控制。
    }

    return {
      normalizedLayout,
      columnSize,
      rowSize,
      close,
      onResized,
    };
  },
});
</script>

<style lang="less" scoped>
.splitpanes__pane {
  transition: none;
}

.dock-slide {
  &-enter-active,
  &-leave-active {
    transition:
      transform 0.2s cubic-bezier(0.2, 0, 0, 1),
      opacity 0.2s cubic-bezier(0.2, 0, 1);
    will-change: transform, opacity;
  }

  /* 关闭最后一个面板时脱离 flex 布局流：主内容立即补位，dock 在原位淡出，
     避免 22rem 区域停留 200ms 才塌缩造成的页面卡顿。 */
  &-leave-active {
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
    bottom: 0.5rem;
    width: 22rem;
    margin-left: 0;
    pointer-events: none;
  }

  &-enter-from,
  &-leave-to {
    opacity: 0;
    transform: translateX(8px);
  }
}
</style>
