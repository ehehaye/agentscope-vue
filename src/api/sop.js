import { client } from './client';

/**
 * SOP 服务：流程（procedure）与运行（run）。
 * 文档：https://docs.agentscope.io/zh/versions/2.0.9/deploy/sop
 */
export const sopApi = {
  list: () => client.request('sop.list'),

  get: (sopId) => client.request('sop.get', { pathParams: { sopId } }),

  create: (data) => client.request('sop.create', { body: { data } }),

  update: (sopId, data) => client.request('sop.update', { pathParams: { sopId }, body: { data } }),

  remove: (sopId) => client.request('sop.remove', { pathParams: { sopId } }),

  /** inputs 为 SDK 的 Msg 数组；发起后运行在后台推进。 */
  startRun: (sopId, inputs) => client.request('sop.startRun', { pathParams: { sopId }, body: { inputs } }),

  /** params 支持 sop_id 与 phase（pending/running/awaiting/completed/failed）。 */
  listRuns: (params) => client.request('sop.listRuns', { params }),

  getRun: (sopRunId) => client.request('sop.getRun', { pathParams: { sopRunId } }),

  removeRun: (sopRunId) => client.request('sop.removeRun', { pathParams: { sopRunId } }),

  submitVerdict: (sopRunId, { step_index, passed, message = '' }) =>
    client.request('sop.submitVerdict', {
      pathParams: { sopRunId },
      body: { step_index, passed, message },
    }),
};
