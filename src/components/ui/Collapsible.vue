<template>
  <div class="tw-collapsible">
    <div
      class="tw-collapsible-trigger tw-flex tw-cursor-pointer tw-items-center tw-gap-2"
      :class="[triggerClass, { 'tw-cursor-default': !expandable }]"
      @click="toggle"
    >
      <slot name="trigger" :open="isOpen" />
      <!-- 默认折叠指示图标，可用 #icon="{ open }" 插槽覆盖 -->
      <slot name="icon" :open="isOpen">
        <Icon
          v-if="expandable"
          icon="lucide:chevron-right"
          class="tw-h-3 tw-w-3 tw-shrink-0 tw-transition-transform"
          :class="{ 'tw-rotate-90': isOpen }"
        />
      </slot>
    </div>
    <transition
      name="collapse"
      @enter="enter"
      @after-enter="afterEnter"
      @leave="leave"
    >
      <div v-show="isOpen" class="tw-collapsible-content tw-overflow-hidden">
        <slot />
      </div>
    </transition>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@/plugins/iconify';

export default defineComponent({
  name: 'Collapsible',
  components: { Icon },
  props: {
    defaultOpen: { type: Boolean, default: false },
    expandable: { type: Boolean, default: true },
    open: { type: Boolean, default: undefined },
    triggerClass: { type: String, default: '' },
  },
  setup(props, { emit }) {
    const internalOpen = ref(props.defaultOpen);

    const isOpen = computed({
      get() {
        return props.open === undefined ? internalOpen.value : props.open;
      },
      set(val) {
        if (props.open === undefined) {
          internalOpen.value = val;
        } else {
          emit('update:open', val);
        }
      },
    });

    function toggle() {
      if (!props.expandable) return;
      isOpen.value = !isOpen.value;
    }

    function enter(el) {
      el.style.height = '0';
      // force reflow
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

    return { isOpen, toggle, enter, afterEnter, leave };
  },
});
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: height 200ms ease;
}
</style>
