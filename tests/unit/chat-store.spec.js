import chat from '@/store/modules/chat';
import { sessionApi } from '@/api';
import { EventType } from '@agentscope-ai/agentscope/event';
import { AppReplyPhase } from '@/constants/app-state';

jest.mock('@/api', () => ({
  sessionApi: { messages: jest.fn() },
}));

const user = (id) => ({ id, role: 'user', name: 'sop', content: [] });
const assistant = (id) => ({ id, role: 'assistant', name: 'a', content: [] });

function makeContext(overrides = {}) {
  const state = { ...chat.state(), ...overrides };
  const commit = (type, payload) => chat.mutations[type](state, payload);
  return { state, commit };
}

const ids = (state) => state.messages.map((m) => m.id);

describe('chat/processEvent 并发回复（团队 / TeamPipeline）', () => {
  const evt = (type, replyId, extra = {}) => ({
    id: `${type}-${Math.random()}`,
    created_at: new Date().toISOString(),
    type,
    reply_id: replyId,
    ...extra,
  });

  it('不同 reply_id 的事件落到各自消息，全部结束前保持 streaming', () => {
    const { state, commit } = makeContext();
    const process = (event) => chat.actions.processEvent({ state, commit }, { event });

    process(evt(EventType.REPLY_START, 'leader', { name: 'TeamPipeline' }));
    process(evt(EventType.REPLY_START, 'member', { name: 'Researcher' }));
    expect(ids(state)).toEqual(['leader', 'member']);

    process(evt(EventType.TEXT_BLOCK_START, 'leader', { block_id: 'l1' }));
    process(evt(EventType.TEXT_BLOCK_START, 'member', { block_id: 'm1' }));
    process(evt(EventType.TEXT_BLOCK_DELTA, 'leader', { block_id: 'l1', delta: 'leader says' }));
    process(evt(EventType.TEXT_BLOCK_DELTA, 'member', { block_id: 'm1', delta: 'member says' }));

    const byId = (id) => state.messages.find((m) => m.id === id);
    expect(byId('leader').content[0].text).toBe('leader says');
    expect(byId('member').content[0].text).toBe('member says');

    // 成员先结束：仍有 leader 在回复
    process(evt(EventType.REPLY_END, 'member'));
    expect(state.phase).toBe(AppReplyPhase.STREAMING);
    expect(state.currentReplyId).toBe('leader');

    // leader 结束后才回到 idle
    process(evt(EventType.REPLY_END, 'leader'));
    expect(state.phase).toBe(AppReplyPhase.IDLE);
    expect(state.currentReplyId).toBe(null);
    expect(state.activeReplyIds).toEqual([]);
  });

  it('未开始过的 reply_id 事件不会误写到当前回复上', () => {
    const { state, commit } = makeContext();
    const process = (event) => chat.actions.processEvent({ state, commit }, { event });

    process(evt(EventType.REPLY_START, 'leader', { name: 'TeamPipeline' }));
    process(evt(EventType.TEXT_BLOCK_START, 'leader', { block_id: 'l1' }));
    process(evt(EventType.TEXT_BLOCK_DELTA, 'ghost', { block_id: 'g1', delta: 'x' }));

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].content).toHaveLength(1);
  });
});

describe('chat/reloadMessages', () => {
  beforeEach(() => {
    sessionApi.messages.mockReset();
  });

  it('只拉尾部一页，补到的消息插在新回复之前', async () => {
    const streaming = assistant('reply-2');
    const { state, commit } = makeContext({
      currentKey: 'agent-1:session-1',
      messages: [user('user-1'), assistant('reply-1')],
    });
    sessionApi.messages.mockImplementation(async () => {
      // 请求期间新回复已开始并占位。
      state.currentReplyId = 'reply-2';
      state.messages = [...state.messages, streaming];
      return { messages: [user('user-1'), assistant('reply-1'), user('user-2')] };
    });

    await chat.actions.reloadMessages({ state, commit }, { replyId: 'reply-2' });

    expect(sessionApi.messages).toHaveBeenCalledWith('session-1', 'agent-1', { limit: 10 });
    expect(ids(state)).toEqual(['user-1', 'reply-1', 'user-2', 'reply-2']);
    expect(state.messages[3]).toBe(streaming);
  });

  it('limit 可覆盖默认的尾部条数', async () => {
    const local = [user('user-1'), assistant('reply-1')];
    const { state, commit } = makeContext({ currentKey: 'agent-1:session-1', messages: local });
    sessionApi.messages.mockResolvedValue({ messages: local });

    await chat.actions.reloadMessages({ state, commit }, { limit: 3 });

    expect(sessionApi.messages).toHaveBeenCalledWith('session-1', 'agent-1', { limit: 3 });
  });

  it('回复已在本地时视为重放，跳过请求', async () => {
    const { state, commit } = makeContext({
      currentKey: 'agent-1:session-1',
      messages: [user('user-1'), assistant('reply-1')],
    });

    await chat.actions.reloadMessages({ state, commit }, { replyId: 'reply-1' });

    expect(sessionApi.messages).not.toHaveBeenCalled();
  });

  it('本地最后一条已是用户消息时跳过请求', async () => {
    const { state, commit } = makeContext({
      currentKey: 'agent-1:session-1',
      messages: [user('user-1')],
    });

    await chat.actions.reloadMessages({ state, commit });

    expect(sessionApi.messages).not.toHaveBeenCalled();
  });

  it('尾部没有新消息时不改动列表', async () => {
    const local = [user('user-1'), assistant('reply-1')];
    const { state, commit } = makeContext({ currentKey: 'agent-1:session-1', messages: local });
    sessionApi.messages.mockResolvedValue({ messages: local });

    await chat.actions.reloadMessages({ state, commit });

    expect(state.messages).toBe(local);
  });

  it('回复在拉取期间结束时仍按 reply_id 插到它前面', async () => {
    const { state, commit } = makeContext({
      currentKey: 'agent-1:session-1',
      messages: [user('user-1'), assistant('reply-1')],
    });
    sessionApi.messages.mockImplementation(async () => {
      // 请求期间新回复开始并结束，currentReplyId 已被 REPLY_END 清空。
      state.messages = [...state.messages, assistant('reply-2')];
      return { messages: [user('user-1'), assistant('reply-1'), user('user-2')] };
    });

    await chat.actions.reloadMessages({ state, commit }, { replyId: 'reply-2' });

    expect(ids(state)).toEqual(['user-1', 'reply-1', 'user-2', 'reply-2']);
  });

  it('拉取期间会话已切换时丢弃结果', async () => {
    const { state, commit } = makeContext({
      currentKey: 'agent-1:session-1',
      messages: [user('user-1'), assistant('reply-1')],
    });
    sessionApi.messages.mockImplementation(async () => {
      state.currentKey = 'agent-1:session-2';
      return { messages: [user('other')] };
    });

    await chat.actions.reloadMessages({ state, commit });

    expect(ids(state)).toEqual(['user-1', 'reply-1']);
  });
});
