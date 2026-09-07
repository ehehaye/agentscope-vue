import { client } from './client';

export const agentApi = {
	list: () => client.get('/agent/'),

	getSchema: () => client.get('/agent/schema/v2'),

	create: (body, options) => client.post('/agent/', body, undefined, options),

	update: (agentId, body, options) => client.patch(`/agent/${agentId}`, body, undefined, options),

	delete: (agentId) => client.delete(`/agent/${agentId}`),
};
