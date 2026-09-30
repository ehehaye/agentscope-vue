<template>
  <span
    class="connection-status"
    role="status"
    :aria-label="status.label"
  >
    <i
      class="connection-status__dot"
      :class="`connection-status__dot--${status.tone}`"
    />
    <span class="connection-status__label">{{ status.label }}</span>
  </span>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { AppConnectionState } from '@/store/modules/chat';

/**
 * 本应用自定义的连接状态 → 展示映射（文案与灯色都属于前端约定，SDK 不提供）。
 * 中间态（创建/加载/连接）统一为蓝色闪烁，已连接为绿色常亮，未连接为灰色。
 */
const STATUS = {
  [AppConnectionState.IDLE]: { label: '会话未连接', tone: 'idle' },
  [AppConnectionState.CREATING]: { label: '会话创建中', tone: 'pending' },
  [AppConnectionState.LOADING]: { label: '会话加载中', tone: 'pending' },
  [AppConnectionState.CONNECTING]: { label: '会话连接中', tone: 'pending' },
  [AppConnectionState.READY]: { label: '会话已连接', tone: 'ready' },
};

export default defineComponent({
  name: 'ConnectionStatus',
  props: {
    /** 取值见 AppConnectionState（本应用自定义枚举）。 */
    connection: { type: String, default: AppConnectionState.IDLE },
  },
  setup(props) {
    const status = computed(() => STATUS[props.connection] || STATUS[AppConnectionState.IDLE]);
    return { status };
  },
});
</script>

<style lang="less" scoped>
.connection-status {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;

  &__dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--as-muted-foreground);

    &--pending {
      background-color: rgb(64, 158, 255);
      animation: connection-status-blink 1s ease-in-out infinite;
    }

    &--ready {
      background-color: #22c55e;
    }
  }

  &__label {
    overflow: hidden;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@keyframes connection-status-blink {
  0%,
  100% {
    opacity: 0.25;
  }

  50% {
    opacity: 1;
  }
}
</style>
