import { client } from './client';

/**
 * 用户已安装的技能库。
 * 注意：与工作区中的 skill 不同，这里管理的是用户级别的已安装技能记录。
 */
export const skillApi = {
  list: () => client.get('/skill'),

  /** 与列表端点不同，此端点会返回 SKILL.md 正文。 */
  get: (skillId) => client.get(`/skill/${encodeURIComponent(skillId)}`),

  /** 从库中移除；已放入工作区的技能会保留其副本。 */
  remove: (skillId) => client.delete(`/skill/${encodeURIComponent(skillId)}`),
};
