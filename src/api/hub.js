import { client } from './client';

const segment = (value) => encodeURIComponent(value);

function browseQuery(params = {}) {
  const query = {};
  if (params?.q) query.q = params.q;
  if (params?.cursor) query.cursor = params.cursor;
  if (params?.limit !== undefined) query.limit = String(params.limit);
  return query;
}

export const hubApi = {
  mcp: {
    listHubs: () => client.get('/hub/mcp'),

    listCards: (hubId, params) =>
      client.get(`/hub/mcp/${segment(hubId)}/cards`, browseQuery(params)),

    getCard: (hubId, cardId) =>
      client.get(`/hub/mcp/${segment(hubId)}/cards/${segment(cardId)}`),

    install: (hubId, cardId, body, options) =>
      client.post(`/hub/mcp/${segment(hubId)}/cards/${segment(cardId)}/install`, body, undefined, options),
  },

  skill: {
    listHubs: () => client.get('/hub/skill'),

    listCards: (hubId, params) =>
      client.get(`/hub/skill/${segment(hubId)}/cards`, browseQuery(params)),

    getCard: (hubId, cardId) =>
      client.get(`/hub/skill/${segment(hubId)}/cards/${segment(cardId)}`),

    install: (hubId, cardId, name, options) =>
      client.post(`/hub/skill/${segment(hubId)}/cards/${segment(cardId)}/install`, undefined, name ? { name } : undefined, options),
  },
};
