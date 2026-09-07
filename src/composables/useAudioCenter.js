/**
 * 音频中心（迁移方案 02 §4.5 / 03 Phase 5）。
 * L2 provide/inject：在聊天子树根部 provide 一个 StreamingAudioManager 实例。
 * - store 侧 SSE 路由经 useAudioCenter() 拿同一实例 start/append/end。
 * - 组件侧用 useAudioBlock(blockId) 订阅单块状态，触发响应式重渲染。
 * 音频 DataBlock 不随 fixture 回放出现，验证依赖真实 omni 后端。
 */
import { provide, inject, ref, computed, onMounted, onUnmounted } from '@/composables/vue';
import { StreamingAudioManager } from '@/utils/streamingAudio';

const AUDIO_CENTER_KEY = '__audio_center';

export function provideAudioCenter() {
  const manager = new StreamingAudioManager();
  provide(AUDIO_CENTER_KEY, manager);
  return manager;
}

export function useAudioCenter() {
  const manager = inject(AUDIO_CENTER_KEY, null);
  return manager;
}

/**
 * 订阅单个音频 DataBlock 的播放状态。无 provider 时返回惰性空值
 *（dev fixture 回放页无 audio center，气泡仍需可渲染）。
 * @param {import('vue').Ref<string>|string} blockId
 */
export function useAudioBlock(blockId) {
  const manager = useAudioCenter();
  const state = ref(null);
  let unsubscribe = null;

  function sync() {
    const id = typeof blockId === 'string' ? blockId : blockId.value;
    state.value = (manager && manager.getState(id)) || null;
  }

  onMounted(() => {
    if (!manager) return;
    const id = typeof blockId === 'string' ? blockId : blockId.value;
    if (!id) return;
    state.value = manager.getState(id) || null;
    unsubscribe = manager.subscribe(id, sync);
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  const url = computed(() => state.value?.url ?? null);
  const status = computed(() => state.value?.status ?? null);
  const isStreaming = computed(() => status.value === 'streaming');
  const interruptCount = computed(() => state.value?.interruptCount ?? 0);

  return { state, url, status, isStreaming, interruptCount };
}