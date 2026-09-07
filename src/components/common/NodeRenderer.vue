<template>
  <component
    :is="getComponent(node.tagName)"
    v-bind="node.attribs"
  >
    <template
      v-for="(child, index) in node.children"
    >
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
import { defineComponent } from '@/composables/vue'

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
  methods: {
    getComponent(tagName) {
      return this.CUSTOM_COMPONENTS[tagName] || tagName
    },
  },
})
</script>

<style lang="less">

</style>
