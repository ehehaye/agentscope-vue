import { client } from './client';

/**
 * 用户已安装的 MCP 库。
 * 注意：与工作区中的 MCP 不同，这里管理的是用户级别的已安装记录。
 */
export const mcpApi = {
  list: () => client.request('mcp.list'),

  update: (mcpId, body) => client.request('mcp.update', { pathParams: { mcpId }, body }),

  remove: (mcpId) => client.request('mcp.remove', { pathParams: { mcpId } }),
};
