import { client } from './client';

export const channelApi = {
	listTypes: () => client.get('/channels/types'),

	list: () => client.get('/channels/'),

	get: (channelId) => client.get(`/channels/${channelId}`),

	create: (body) => client.post('/channels/', body),

	update: (channelId, body) => client.patch(`/channels/${channelId}`, body),

	delete: (channelId) => client.delete(`/channels/${channelId}`),

	enable: (channelId) => client.post(`/channels/${channelId}/enable`),

	disable: (channelId) => client.post(`/channels/${channelId}/disable`),

	status: (channelId) => client.get(`/channels/${channelId}/status`),

	listSessions: (channelId) => client.get(`/channels/${channelId}/sessions`),

	listChatIds: (channelId) => client.get(`/channels/${channelId}/chat_ids`),

	startBinding: (channelType) =>
		client.post('/channels/bindings', { channel_type: channelType }),

	/** Report the session; this call is also what advances it. */
	pollBinding: (bindingId) => client.get(`/channels/bindings/${bindingId}`),

	cancelBinding: (bindingId, options = {}) =>
		client.post(`/channels/bindings/${bindingId}/cancel`, undefined, undefined, options),
};
