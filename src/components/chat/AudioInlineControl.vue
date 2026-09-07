<template>
  <span class="tw-inline-flex tw-items-center">
    <template v-if="isStreaming">
      <span class="audio-wave tw-ml-1">
        <i v-for="n in 6" :key="n" class="audio-wave-bar" :style="{ animationDelay: (n - 1) * 0.12 + 's' }" />
      </span>
    </template>
    <template v-else-if="src">
      <button
        type="button"
        class="audio-play-btn tw-ml-1"
        :aria-label="isPlaying ? '暂停' : '播放'"
        @click="toggle"
      >
        <span v-if="isPlaying" class="audio-wave">
          <i v-for="n in 6" :key="n" class="audio-wave-bar" :style="{ animationDelay: (n - 1) * 0.12 + 's' }" />
        </span>
        <Icon v-else icon="lucide:play" class="tw-h-3 tw-w-3" />
      </button>
      <audio
        ref="audioRef"
        :src="src"
        preload="auto"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @ended="isPlaying = false"
      />
    </template>
  </span>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { useAudioBlock } from '@/composables/useAudioCenter.js';

export default defineComponent({
  name: 'AudioInlineControl',
  components: { Icon },
  props: {
    block: { type: Object, required: true },
  },
  setup(props) {
    const { isStreaming, url, interruptCount } = useAudioBlock(props.block.id);
    const audioRef = ref(null);
    const isPlaying = ref(false);

    const src = computed(() => {
      if (isStreaming.value) return null;
      if (url.value) return url.value;
      const s = props.block.source;
      if (s.type === 'url') return s.url;
      if (s.type === 'base64' && s.data) return `data:${s.media_type};base64,${s.data}`;
      return null;
    });

    // 源变化时重置 audio 元素
    watch(src, (newSrc) => {
      nextTick(() => {
        const el = audioRef.value;
        if (!el || !newSrc) return;
        isPlaying.value = false;
        el.load();
      });
    });

    // 被中断时暂停
    watch(interruptCount, (count) => {
      if (count === 0) return;
      const el = audioRef.value;
      if (el && !el.paused) el.pause();
    });

    function toggle() {
      const el = audioRef.value;
      if (!el) return;
      if (el.paused) {
        el.play().catch((e) => console.error('Audio playback failed', e));
      } else {
        el.pause();
      }
    }

    return { isStreaming, src, audioRef, isPlaying, toggle };
  },
});
</script>

<style lang="less" scoped>
.audio-play-btn {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.7;
  }
}

.audio-wave {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  height: 12px;
}

.audio-wave-bar {
  display: inline-block;
  width: 2px;
  height: 100%;
  background: currentColor;
  border-radius: 1px;
  transform-origin: center;
  animation: audioWave 0.8s ease-in-out infinite;
}

@keyframes audioWave {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.3); }
}
</style>
