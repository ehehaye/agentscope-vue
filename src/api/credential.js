import { client } from './client';

export const credentialApi = {
  list: () => client.request('credential.list'),

  schemas: () => client.request('credential.schemas'),

  create: (body) => client.request('credential.create', { body }),

  update: (credentialId, body) => client.request('credential.update', { pathParams: { credentialId }, body }),

  remove: (credentialId) => client.request('credential.remove', { pathParams: { credentialId } }),
};
