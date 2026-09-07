import { ref, watch, unref } from '@/composables/vue';
import { workspaceApi } from '@/api';

/**
 * 当前会话的工作区 MCP / Skill 管理。
 * @param {import('@vue/composition-api').Ref<string|null>|string|null} agentId
 * @param {import('@vue/composition-api').Ref<string|null>|string|null} sessionId
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

  async function addMcps(agentIdValue, sessionIdValue, configs) {
    await workspaceApi.mcp.add(agentIdValue, sessionIdValue, configs);
    await refetch();
  }

  async function addMcpsFromLibrary(agentIdValue, sessionIdValue, mcpIds) {
    await workspaceApi.mcp.addFromLibrary(agentIdValue, sessionIdValue, mcpIds);
    await refetch();
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
    await workspaceApi.skill.upload(aid, sid, files, options);
    await refetch();
  }

  async function addSkillsFromLibrary(skillIds) {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    await workspaceApi.skill.addFromLibrary(aid, sid, skillIds);
    await refetch();
  }

  async function removeSkill(name) {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    await workspaceApi.skill.remove(name, aid, sid);
    await refetch();
  }

  watch(
    () => [unref(agentId), unref(sessionId)],
    () => refetch(),
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
