<template>
  <component
    :is="getComponent(node.tagName)"
    v-bind="safeAttribs"
  >
    <template v-for="(child, index) in node.children">
      <template v-if="child.type === 'text'">{{ child.data }}</template>
      <NodeRenderer
        v-else
        :key="index"
        :node="child"
      />
    </template>
  </component>
</template>

<script>
import { defineComponent } from '@/composables/vue';

export default defineComponent({
  name: 'NodeRenderer',
  inject: {
    CUSTOM_COMPONENTS: {
      default: () => ({}),
    },
  },
  props: {
    node: {
      type: Object,
      required: true,
    },
  },
  computed: {
    // 只透传展示属性：事件处理器与 data-* 不作为 props 传给组件（纵深防御，
    // 正常情况下上游 DOMPurify 已剥离，这里兜底防配置回退或自定义组件注入）。
    safeAttribs() {
      const out = {};
      for (const [key, value] of Object.entries(this.node.attribs || {})) {
        if (/^on/i.test(key) || /^data-/i.test(key)) continue;
        out[key] = value;
      }
      return out;
    },
  },
  methods: {
    getComponent(tagName) {
      return this.CUSTOM_COMPONENTS[tagName] || tagName;
    },
  },
});
</script>

<style lang="less"></style>
