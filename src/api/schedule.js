import { client } from './client';

export const scheduleApi = {
  list: () => client.request('schedule.list'),

  create: (body) => client.request('schedule.create', { body }),

  update: (scheduleId, body) =>
    client.request('schedule.update', { pathParams: { scheduleId }, body }),

  delete: (scheduleId) =>
    client.request('schedule.delete', { pathParams: { scheduleId } }),

  listSessions: (scheduleId) =>
    client.request('schedule.listSessions', { pathParams: { scheduleId } }),
};
