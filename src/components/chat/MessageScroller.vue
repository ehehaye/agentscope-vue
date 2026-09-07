<template>
  <div ref="viewport" class="tw-relative tw-h-full tw-w-full tw-overflow-y-auto" @scroll="onScroll">
    <div ref="content" class="tw-flex tw-min-h-full tw-flex-col tw-gap-6 tw-p-4">
      <slot />
    </div>
    <el-button
      v-if="showScrollButton"
      type="default"
      size="mini"
      circle
      class="tw-absolute tw-bottom-4 tw-left-1/2 tw--translate-x-1/2"
      @click="scrollToBottom"
    >
      <Icon icon="lucide:arrow-down" class="tw-h-4 tw-w-4" />
    </el-button>
  </div>
</template>

<script>
import { defineComponent, ref, watch, nextTick } from '@/composables/vue';
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
