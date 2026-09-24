<template>
  <Collapsible :expandable="expandable">
    <template #trigger>
      <div class="tw-group tw-flex tw-items-center tw-gap-2">
        <span class="tw-shrink-0">{{ displayName }}</span>
        <span v-if="arg" class="tw-min-w-0 tw-truncate tw-font-medium">{{ arg }}</span>
        <ToolStateIcon :state="pair.result?.state" />
      </div>
    </template>
    <div class="tw-mt-2">
      <component :is="renderer" :pair="pair" />
    </div>
  </Collapsible>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import Collapsible from '@/components/ui/Collapsible.vue';
import ToolStateIcon from './ToolStateIcon.vue';
import { parseInput, tryGetFileName, tryGetFilePath } from './tool-utils';
import { getRenderer } from './tool-renderers';
import DefaultRenderer from './tool-renderers/DefaultRenderer.vue';

export default defineComponent({
  name: 'ToolCallRow',
  components: { Collapsible, ToolStateIcon },
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const displayName = computed(() => props.pair.call.name);
    const input = computed(() => parseInput(props.pair.call.input));
    const arg = computed(() => {
      if (props.pair.call.name === 'Bash') return input.value.command;
      if (['Read', 'Write', 'Edit'].includes(props.pair.call.name)) {
        return tryGetFileName(props.pair.call.input);
      }
      if (props.pair.call.name === 'Grep') return input.value.pattern;
      if (props.pair.call.name === 'Glob') return input.value.pattern;
      if (props.pair.call.name === 'TaskCreate') return input.value.subject;
      return '';
    });
    const filePath = computed(() => tryGetFilePath(props.pair.call.input));
    const renderer = computed(() => getRenderer(props.pair.call.name) || DefaultRenderer);
    const expandable = computed(() => !!props.pair.result);

    return { displayName, arg, filePath, expandable, renderer };
  },
});
</script>
