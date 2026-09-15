import { client } from './client';

export const agentApi = {
	list: () => client.request('agent.list'),

	getSchema: () => client.request('agent.getSchema'),

	create: (body, options) => client.request('agent.create', { body, ...options }),

	update: (agentId, body, options) =>
		client.request('agent.update', { pathParams: { agentId }, body, ...options }),

	delete: (agentId) => client.request('agent.delete', { pathParams: { agentId } }),
};
