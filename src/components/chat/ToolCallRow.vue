<template>
  <div>
    <div
      class="group flex items-center gap-2"
      :class="expandable ? 'cursor-pointer' : ''"
      @click="toggle"
    >
      <span class="shrink-0">{{ displayName }}</span>
      <span v-if="arg" class="min-w-0 truncate font-medium">{{ arg }}</span>
      <ToolStateIcon :state="pair.result?.state" />
      <Icon
        v-if="expandable"
        icon="lucide:chevron-right"
        class="h-3 w-3 shrink-0 transition-transform"
        :class="{ 'rotate-90': open }"
      />
    </div>
    <transition
      name="collapse"
      @enter="enter"
      @after-enter="afterEnter"
      @leave="leave"
    >
      <div v-show="open" class="overflow-hidden">
        <div class="mt-2">
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
