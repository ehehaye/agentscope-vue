<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-p-4">
    <div class="tw-mb-4 tw-flex tw-items-center tw-gap-2">
      <el-select v-model="selectedFixture" placeholder="选择 fixture" size="small">
        <el-option
          v-for="name in fixtureNames"
          :key="name"
          :label="name"
          :value="name"
        />
      </el-select>
      <el-button size="small" type="primary" :disabled="!selectedFixture" @click="replay">
        回放
      </el-button>
      <el-button size="small" @click="reset">重置</el-button>
    </div>
    <div class="tw-flex-1 tw-rounded-22px tw-bg-card tw-p-2 tw-shadow-panel">
      <ChatContent
        :msgs="msgs"
        :loading="loading"
        :phase="phase"
        :disabled="false"
        :allowed-input-types="[]"
        @send="send"
        @interrupt="interrupt"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { useStore } from '@/composables/vuex';
import ChatContent from '@/components/chat/ChatContent.vue';
import * as fixtures from '@/fixtures/sse';

const fixtureNames = [
  'textReply',
  'thinkingTextReply',
  'toolCallHitlPending',
  'toolCallFullCycle',
];

export default defineComponent({
  name: 'ChatDevPage',
  components: { ChatContent },
  setup() {
    const store = useStore();
    const selectedFixture = ref('textReply');

    const msgs = computed(() => store.state.chat.messages);
    const loading = computed(() => store.state.chat.loading);
    const phase = computed(() => store.state.chat.phase);

    // dev 页仅用 fixture 本地回放状态机，不能走 openConversation——
    // 那会请求不存在的 dev-session 历史/SSE，产生错误 toast 与网络竞态。
    store.commit('chat/RESET');

    async function replay() {
      const events = fixtures[selectedFixture.value];
      if (!events) return;
      store.commit('chat/RESET');
      store.commit('chat/SET_KEY', 'dev-agent:dev-session');
      for (const event of events) {
        await store.dispatch('chat/processEvent', { event });
        // 给 UI 留一帧渲染时间
        await new Promise((r) => requestAnimationFrame(r));
      }
    }

    function reset() {
      store.commit('chat/RESET');
    }

    function send(blocks) {
      // eslint-disable-next-line no-console
      console.log('send', blocks);
    }

    function interrupt() {
      // eslint-disable-next-line no-console
      console.log('interrupt');
    }

    return {
      fixtureNames,
      selectedFixture,
      msgs,
      loading,
      phase,
      replay,
      reset,
      send,
      interrupt,
    };
  },
});
</script>
