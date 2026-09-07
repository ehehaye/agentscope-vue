<template>
  <div ref="viewport" class="relative h-full w-full overflow-y-auto" @scroll="onScroll">
    <div ref="content" class="flex min-h-full flex-col gap-6 p-4">
      <slot />
    </div>
    <el-button
      v-if="showScrollButton"
      type="default"
      size="mini"
      circle
      class="absolute bottom-4 left-1/2 -translate-x-1/2"
      @click="scrollToBottom"
    >
      <Icon icon="lucide:arrow-down" class="h-4 w-4" />
    </el-button>
  </div>
</template>

<script>
import { defineComponent, ref, watch, nextTick } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';

export default defineComponent({
  name: 'MessageScroller',
  components: { Icon },
  props: {
    autoScroll: { type: Boolean, default: true },
    itemsLength: { type: Number, default: 0 },
  },
  setup(props) {
    const viewport = ref(null);
    const content = ref(null);
    const showScrollButton = ref(false);
    let userScrolledUp = false;

    function isNearBottom() {
      if (!viewport.value) return true;
      const el = viewport.value;
      return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    }

    function scrollToBottom() {
      if (!viewport.value) return;
      viewport.value.scrollTop = viewport.value.scrollHeight;
      userScrolledUp = false;
      showScrollButton.value = false;
    }

    function onScroll() {
      if (!viewport.value) return;
      const nearBottom = isNearBottom();
      userScrolledUp = !nearBottom;
      showScrollButton.value = userScrolledUp;
    }

    watch(
      () => props.itemsLength,
      () => {
        if (!props.autoScroll || userScrolledUp) return;
        nextTick(() => {
          scrollToBottom();
        });
      },
    );

    return { viewport, content, showScrollButton, onScroll, scrollToBottom };
  },
});
</script>
