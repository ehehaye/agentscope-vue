import { client } from '@/api/client';
import { sessionApi } from '@/api/session';

jest.mock('@/api/client', () => ({ client: { request: jest.fn() } }));

describe('sessionApi.messagesAll', () => {
  beforeEach(() => client.request.mockReset());

  it('按游标向前翻页，并把各页按时间升序拼接', async () => {
    client.request
      .mockResolvedValueOnce({ messages: [{ id: 'm3' }, { id: 'm4' }], has_more: true })
      .mockResolvedValueOnce({ messages: [{ id: 'm1' }, { id: 'm2' }], has_more: false });

    const all = await sessionApi.messagesAll('s1', 'a1');

    expect(all.map((msg) => msg.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(client.request).toHaveBeenNthCalledWith(1, 'session.messages', {
      pathParams: { sessionId: 's1' },
      params: { agent_id: 'a1', limit: '200' },
    });
    expect(client.request).toHaveBeenNthCalledWith(2, 'session.messages', {
      pathParams: { sessionId: 's1' },
      params: { agent_id: 'a1', limit: '200', before: 'm3' },
    });
  });

  it('has_more 为 false 时只请求一页', async () => {
    client.request.mockResolvedValue({ messages: [{ id: 'm1' }], has_more: false });

    const all = await sessionApi.messagesAll('s1', 'a1');

    expect(all.map((msg) => msg.id)).toEqual(['m1']);
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('has_more 但没有游标时停止，避免死循环', async () => {
    client.request.mockResolvedValue({ messages: [{ text: '无 id' }], has_more: true });

    const all = await sessionApi.messagesAll('s1', 'a1');

    expect(all).toHaveLength(1);
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('空页直接结束', async () => {
    client.request.mockResolvedValue({ messages: [], has_more: true });

    await expect(sessionApi.messagesAll('s1', 'a1')).resolves.toEqual([]);
    expect(client.request).toHaveBeenCalledTimes(1);
  });
});
