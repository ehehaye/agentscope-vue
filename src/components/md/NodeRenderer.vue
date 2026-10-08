<template>
  <component
    :is="resolved.component"
    v-bind="resolved.props"
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
import { resolveRenderer } from './registry';

export default defineComponent({
  name: 'NodeRenderer',
  props: {
    node: {
      type: Object,
      required: true,
    },
  },
  computed: {
    resolved() {
      return (
        resolveRenderer(this.node) || {
          component: this.node.tagName,
          props: this.node.attribs,
        }
      );
    },
  },
});
</script>

<style lang="less"></style>
