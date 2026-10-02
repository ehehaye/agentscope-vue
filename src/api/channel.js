import { client } from './client';

export const channelApi = {
  listTypes: () => client.request('channel.listTypes'),

  list: () => client.request('channel.list'),

  get: (channelId) => client.request('channel.get', { pathParams: { channelId } }),

  create: (body) => client.request('channel.create', { body }),

  update: (channelId, body) => client.request('channel.update', { pathParams: { channelId }, body }),

  remove: (channelId) => client.request('channel.remove', { pathParams: { channelId } }),

  enable: (channelId) => client.request('channel.enable', { pathParams: { channelId } }),

  disable: (channelId) => client.request('channel.disable', { pathParams: { channelId } }),

  status: (channelId) => client.request('channel.status', { pathParams: { channelId } }),

  listSessions: (channelId) => client.request('channel.listSessions', { pathParams: { channelId } }),

  listChatIds: (channelId) => client.request('channel.listChatIds', { pathParams: { channelId } }),

  startBinding: (channelType) => client.request('channel.startBinding', { body: { channel_type: channelType } }),

  /** 上报绑定会话状态；该调用本身也会推进绑定流程。 */
  pollBinding: (bindingId) => client.request('channel.pollBinding', { pathParams: { bindingId } }),

  cancelBinding: (bindingId, options = {}) =>
    client.request('channel.cancelBinding', { pathParams: { bindingId }, ...options }),
};
