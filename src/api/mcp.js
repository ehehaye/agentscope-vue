import { client } from './client';

export const mcpApi = {
  list: () => client.request('mcp.list'),

  update: (mcpId, body) =>
    client.request('mcp.update', { pathParams: { mcpId }, body }),

  remove: (mcpId) => client.request('mcp.remove', { pathParams: { mcpId } }),
};
