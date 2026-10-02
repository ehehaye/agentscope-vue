import { client } from './client';

export const scheduleApi = {
  list: () => client.request('schedule.list'),

  create: (body) => client.request('schedule.create', { body }),

  update: (scheduleId, body) => client.request('schedule.update', { pathParams: { scheduleId }, body }),

  remove: (scheduleId) => client.request('schedule.remove', { pathParams: { scheduleId } }),

  listSessions: (scheduleId) => client.request('schedule.listSessions', { pathParams: { scheduleId } }),
};
