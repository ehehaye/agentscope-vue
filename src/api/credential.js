import { client } from './client';

export const credentialApi = {
	list: () => client.get('/credential/'),

	schemas: () => client.get('/credential/schemas'),

	create: (body) => client.post('/credential/', body),

	update: (credentialId, body) => client.patch(`/credential/${credentialId}`, body),

	delete: (credentialId) => client.delete(`/credential/${credentialId}`),
};
