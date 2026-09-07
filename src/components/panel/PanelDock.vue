<template>
  <transition name="dock-slide">
    <div v-show="normalizedLayout.length > 0" class="h-full">
      <splitpanes class="h-full" @resized="onResized">
        <pane
          v-for="(column, colIdx) in normalizedLayout"
          :key="colKey(column)"
          :size="columnSize"
        >
          <splitpanes horizontal @resized="onResized">
            <pane
              v-for="key in column"
              :key="key"
              :size="rowSize(column.length)"
              class="tw-rounded-22px bg-card shadow-panel"
            >
              <Panel
                :title="panels[key]?.title || key"
                :icon="panels[key]?.icon"
                @close="close(key)"
              >
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

    const columnSize = computed(() =>
      normalizedLayout.value.length > 0 ? 100 / normalizedLayout.value.length : 100,
    );

    function rowSize(count) {
      return count > 0 ? 100 / count : 100;
    }

    function colKey(column) {
      return column.join('-');
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
      colKey,
      close,
      onResized,
    };
  },
});
</script>

<style scoped>
.splitpanes__pane {
  transition: none;
}

.dock-slide-enter-active,
.dock-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.dock-slide-enter,
.dock-slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
