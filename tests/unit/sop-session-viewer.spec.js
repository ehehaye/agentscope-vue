import Vue from 'vue';
import CompositionApi from '@vue/composition-api';
import { mount } from '@vue/test-utils';
import { nextTick } from '@vue/composition-api';
import SopSessionViewer from '@/components/sop/SopSessionViewer.vue';
import * as useMessagesModule from '@/composables/useMessages';

Vue.use(CompositionApi);

jest.mock('@/composables/useMessages', () => {
  const { ref } = require('@vue/composition-api');
  const state = {
    msgs: ref([]),
    loading: ref(false),
  };
  return {
    __state: state,
    useMessages: () => ({
      msgs: state.msgs,
      loading: state.loading,
      connection: ref('ready'),
      phase: ref('idle'),
      error: ref(null),
      subagentHitl: ref([]),
      send: jest.fn(),
      onUserConfirm: jest.fn(),
      onSubagentConfirm: jest.fn(),
      onAskUserSubmit: jest.fn(),
      onSubagentAskUserSubmit: jest.fn(),
      interrupt: jest.fn(),
      abort: jest.fn(),
      reload: jest.fn(),
    }),
  };
});

jest.mock('@/composables/useAudioCenter', () => ({ provideAudioCenter: () => null }));

jest.mock('@/components/chat/ChatContent.vue', () => ({
  name: 'ChatContent',
  props: ['msgs'],
  render(h) {
    return h(
      'div',
      this.msgs.map((msg) => h('div', { attrs: { 'data-msg-id': msg.id } })),
    );
  },
}));

jest.mock('@/components/chat/ConnectionStatus.vue', () => ({
  name: 'ConnectionStatus',
  render: (h) => h('div'),
}));

const { __state: chatState } = useMessagesModule;

const ENTRIES = [{ session_key: 'writer', agent_id: 'agent-1', session_id: 'session-1', roles: [] }];

function request(overrides = {}) {
  return { sessionKey: 'writer', subject: '', ids: ['msg-1'], ...overrides };
}

async function settle() {
  await nextTick();
  await nextTick();
  jest.advanceTimersByTime(120);
}

describe('SopSessionViewer 消息起点定位', () => {
  let wrapper = null;
  let scrollIntoView;

  function mountViewer() {
    wrapper = mount(SopSessionViewer, {
      propsData: { entries: ENTRIES, agents: [], sessionKey: 'writer', focusRequest: null },
    });
    return wrapper;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    chatState.loading.value = false;
    chatState.msgs.value = [
      { id: 'msg-1', content: [] },
      { id: 'msg-2', content: [] },
    ];
    scrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    wrapper?.destroy();
    wrapper = null;
    jest.useRealTimers();
  });

  it('切入会话时定位到步骤起点', async () => {
    const view = mountViewer();
    view.setProps({ focusRequest: request() });
    await settle();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('历史加载中先等待，加载完成后再定位', async () => {
    chatState.loading.value = true;
    const view = mountViewer();
    view.setProps({ focusRequest: request() });
    await settle();
    expect(scrollIntoView).not.toHaveBeenCalled();

    chatState.loading.value = false;
    await settle();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('同一请求只定位一次，后续消息更新不再回到起点', async () => {
    const view = mountViewer();
    view.setProps({ focusRequest: request() });
    await settle();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    chatState.msgs.value = [...chatState.msgs.value, { id: 'msg-3', content: [] }];
    await settle();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('请求不属于当前会话时忽略', async () => {
    const view = mountViewer();
    view.setProps({ focusRequest: request({ sessionKey: 'other' }) });
    await settle();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
