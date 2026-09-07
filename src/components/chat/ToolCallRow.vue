<template>
  <div>
    <div
      class="tw-group tw-flex tw-items-center tw-gap-2"
      :class="expandable ? 'tw-cursor-pointer' : ''"
      @click="toggle"
    >
      <span class="tw-shrink-0">{{ displayName }}</span>
      <span v-if="arg" class="tw-min-w-0 tw-truncate tw-font-medium">{{ arg }}</span>
      <ToolStateIcon :state="pair.result?.state" />
      <Icon
        v-if="expandable"
        icon="lucide:chevron-right"
        class="tw-h-3 tw-w-3 tw-shrink-0 tw-transition-transform"
        :class="{ 'tw-rotate-90': open }"
      />
    </div>
    <transition
      name="collapse"
      @enter="enter"
      @after-enter="afterEnter"
      @leave="leave"
    >
      <div v-show="open" class="tw-overflow-hidden">
        <div class="tw-mt-2">
          <component :is="renderer" :pair="pair" />
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import ToolStateIcon from './ToolStateIcon.vue';
import { parseInput, tryGetFileName, tryGetFilePath } from './tool-utils';
import { getRenderer } from './tool-renderers';
import DefaultRenderer from './tool-renderers/DefaultRenderer.vue';

export default defineComponent({
  name: 'ToolCallRow',
  components: { Icon, ToolStateIcon },
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const open = ref(false);
    function toggle() {
      if (props.pair.result) open.value = !open.value;
    }

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

    function enter(el) {
      el.style.height = '0';
      void el.offsetHeight;
      el.style.height = `${el.scrollHeight}px`;
    }
    function afterEnter(el) {
      el.style.height = '';
    }
    function leave(el) {
      el.style.height = `${el.scrollHeight}px`;
      void el.offsetHeight;
      el.style.height = '0';
    }

    return { open, toggle, displayName, arg, filePath, expandable, renderer, enter, afterEnter, leave };
  },
});
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: height 200ms ease;
}
</style>
