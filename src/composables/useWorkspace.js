import _ from 'lodash';
import { ref, watch, unref } from '@/composables/vue';
import { workspaceApi } from '@/api';

/**
 * 当前会话的工作区 MCP / Skill 管理。
 * @param {import('vue').Ref<string|null>|string|null} agentId
 * @param {import('vue').Ref<string|null>|string|null} sessionId
 */
export function useWorkspace(agentId, sessionId) {
  const mcps = ref([]);
  const skills = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    const aid = unref(agentId);
    const sid = unref(sessionId);
    if (!aid || !sid) {
      mcps.value = [];
      skills.value = [];
      return { mcps: [], skills: [] };
    }
    loading.value = true;
    error.value = null;
    try {
      const [mcpRes, skillRes] = await Promise.all([
        workspaceApi.mcp.list(aid, sid),
        workspaceApi.skill.list(aid, sid),
      ]);
      const mcpList = mcpRes?.mcps ?? mcpRes ?? [];
      const skillList = skillRes?.skills ?? skillRes ?? [];
      if (id === reqId) {
        mcps.value = mcpList;
        skills.value = skillList;
      }
      return { mcps: mcpList, skills: skillList };
    } catch (e) {
      if (id === reqId) error.value = e;
      return { mcps: [], skills: [] };
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  async function addMcps(configs) {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    if (!aid || !sid) throw new Error('未选择智能体或会话');
    const existing = new Set(mcps.value.map((m) => m.name));
    for (const mcp of configs) {
      if (existing.has(mcp.name)) throw new Error(`MCP 服务「${mcp.name}」已存在于当前工作区。`);
    }
    const batch = new Set();
    for (const mcp of configs) {
      if (batch.has(mcp.name)) throw new Error(`配置中存在重复的 MCP 服务名「${mcp.name}」。`);
      batch.add(mcp.name);
    }
    for (const mcp of configs) {
      await workspaceApi.mcp.add(aid, sid, mcp);
    }
    await refetch();
  }

  async function addMcpsFromLibrary(mcpIds) {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    if (!aid || !sid) throw new Error('未选择智能体或会话');
    const result = await workspaceApi.mcp.addFromLibrary(aid, sid, mcpIds);
    await refetch();
    // 后端逐条上报结果，部分成功也算成功，只抛出没落地的那些。
    const failures = Object.entries(result?.failed || {});
    if (failures.length > 0) {
      throw new Error(failures.map(([name, why]) => `${name}: ${why}`).join('\n'));
    }
  }

  async function removeMcp(name) {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    await workspaceApi.mcp.remove(name, aid, sid);
    await refetch();
  }

  async function uploadSkill(files, options) {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    if (!aid || !sid) throw new Error('未选择智能体或会话');
    await workspaceApi.skill.upload(aid, sid, files, options);
    await refetch();
  }

  async function addSkillsFromLibrary(skillIds) {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    if (!aid || !sid) throw new Error('未选择智能体或会话');
    const result = await workspaceApi.skill.addFromLibrary(aid, sid, skillIds);
    await refetch();
    // 后端逐条上报结果，部分成功也算成功，只抛出没落地的那些。
    const failures = Object.entries(result?.failed || {});
    if (failures.length > 0) {
      throw new Error(failures.map(([name, why]) => `${name}: ${why}`).join('\n'));
    }
  }

  async function removeSkill(name) {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    await workspaceApi.skill.remove(name, aid, sid);
    await refetch();
  }

  watch(
    () => [unref(agentId), unref(sessionId)],
    (next, prev) => {
      if (_.isEqual(next, prev)) return;
      refetch();
    },
    { immediate: true },
  );

  return {
    mcps,
    skills,
    loading,
    error,
    refetch,
    addMcps,
    addMcpsFromLibrary,
    removeMcp,
    uploadSkill,
    addSkillsFromLibrary,
    removeSkill,
  };
}
