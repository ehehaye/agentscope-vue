<template>
  <span
    class="dot-spinner"
    :class="cn(className)"
    role="status"
    aria-label="加载中"
  >
    <i /><i /><i />
  </span>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { cn } from '@/lib/utils';

export default defineComponent({
  name: 'DotSpinner',
  props: {
    className: { type: String, default: '' },
  },
  setup() {
    return { cn };
  },
});
</script>

<style lang="less" scoped>
/* 三个点依次放大缩小，表示"工作中" */
.dot-spinner {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: rgb(64, 158, 255);
    animation: dot-spinner-pulse 2s infinite ease-in-out;

    &:nth-child(2) {
      animation-delay: 0.25s;
    }

    &:nth-child(3) {
      animation-delay: 0.5s;
    }
  }
}

@keyframes dot-spinner-pulse {
  0%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }

  50% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
