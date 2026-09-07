import { client } from './client';

export const mcpApi = {
  list: () => client.get('/mcp'),

  update: (mcpId, body) => client.patch(`/mcp/${encodeURIComponent(mcpId)}`, body),

  remove: (mcpId) => client.delete(`/mcp/${encodeURIComponent(mcpId)}`),
};
