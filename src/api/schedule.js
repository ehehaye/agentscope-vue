import { client } from './client';

export const scheduleApi = {
  list: () => client.get('/schedule/'),

  create: (body) => client.post('/schedule/', body),

  update: (scheduleId, body) => client.patch(`/schedule/${scheduleId}`, body),

  delete: (scheduleId) => client.delete(`/schedule/${scheduleId}`),

  listSessions: (scheduleId) => client.get(`/schedule/${scheduleId}/sessions`),
};
