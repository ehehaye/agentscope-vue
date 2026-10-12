<template>
  <component
    :is="resolved.component"
    v-bind="resolved.props"
  >
    <template v-for="(child, index) in node.children">
      <TextNodeRenderer
        v-if="child.type === 'text'"
        :key="'text-' + index"
        :data="child.data"
      />
      <NodeRenderer
        v-else
        :key="'node-' + index"
        :node="child"
      />
    </template>
  </component>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { resolveRenderer } from './registry';
import TextNodeRenderer from './TextNodeRenderer.vue';

export default defineComponent({
  name: 'NodeRenderer',
  components: {
    TextNodeRenderer,
  },
  props: {
    node: {
      type: Object,
      required: true,
    },
  },
  computed: {
    resolved() {
      if (this.node.type === 'text') {
        return { component: TextNodeRenderer, props: { data: this.node.data } };
      }
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
