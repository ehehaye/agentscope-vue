<template>
  <component
    :is="resolved"
    v-bind="$attrs"
    v-on="$listeners"
  />
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import ExportWordButton from './ExportWordButton.vue';
import ExportPdfButton from './ExportPdfButton.vue';

const EXPORT_COMPONENTS = {
  word: ExportWordButton,
  pdf: ExportPdfButton,
};

export default defineComponent({
  name: 'ExportButton',
  // 透传的属性/事件全部交给被分发的子组件，避免落到根节点上重复绑定
  inheritAttrs: false,
  props: {
    /** 导出类型：word（默认）| pdf */
    type: {
      type: String,
      default: 'word',
      validator: (value) => Object.prototype.hasOwnProperty.call(EXPORT_COMPONENTS, value),
    },
  },
  setup(props) {
    const resolved = computed(() => EXPORT_COMPONENTS[props.type] || EXPORT_COMPONENTS.word);
    return { resolved };
  },
});
</script>
