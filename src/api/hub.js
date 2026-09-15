import { client } from './client';

function browseQuery(params = {}) {
  const query = {};
  if (params?.q) query.q = params.q;
  if (params?.cursor) query.cursor = params.cursor;
  if (params?.limit !== undefined) query.limit = String(params.limit);
  return query;
}

export const hubApi = {
  mcp: {
    listHubs: () => client.request('hub.mcp.listHubs'),

    listCards: (hubId, params) =>
      client.request('hub.mcp.listCards', {
        pathParams: { hubId },
        params: browseQuery(params),
      }),

    getCard: (hubId, cardId) =>
      client.request('hub.mcp.getCard', { pathParams: { hubId, cardId } }),

    install: (hubId, cardId, body, options) =>
      client.request('hub.mcp.install', {
        pathParams: { hubId, cardId },
        body,
        ...options,
      }),
  },

  skill: {
    listHubs: () => client.request('hub.skill.listHubs'),

    listCards: (hubId, params) =>
      client.request('hub.skill.listCards', {
        pathParams: { hubId },
        params: browseQuery(params),
      }),

    getCard: (hubId, cardId) =>
      client.request('hub.skill.getCard', { pathParams: { hubId, cardId } }),

    install: (hubId, cardId, name, options) =>
      client.request('hub.skill.install', {
        pathParams: { hubId, cardId },
        params: name ? { name } : undefined,
        ...options,
      }),
  },
};
