import { ref } from '@/composables/vue';
import { MessageBox } from 'element-ui';

/**
 * 会话与 Agent 的管理交互：对话框开合、新建/重命名/删除、路由跳转。
 * 删除均有确认弹窗；删除当前会话/助手后清空对应路由参数。
 *
 * @param {object} ctx
 * @param {object} route 当前路由对象
 * @param {object} router 路由实例
 * @param {import('@vue/composition-api').Ref} agentId 路由中的 agentId
 * @param {import('@vue/composition-api').Ref} sessionId 路由中的 sessionId
 * @param {(sessionId: string, agentId: string, body: object) => Promise<any>} updateSession
 * @param {(sessionId: string, agentId: string) => Promise<void>} removeSession
 * @param {(agentId: string) => Promise<void>} removeAgent
 * @param {() => void} abort 中断当前回复（新建会话前调用）
 */
export function useSessionManager({
  route,
  router,
  agentId,
  sessionId,
  updateSession,
  removeSession,
  removeAgent,
  abort,
}) {
  const agentDialogVisible = ref(false);
  const editAgentDialogVisible = ref(false);
  const editingAgent = ref(null);
  const renameDialogVisible = ref(false);
  const renamingSession = ref(null);

  /** 跳转到指定会话，返回路由跳转的 Promise（失败时 reject）。 */
  function pushConversation(aid, sid) {
    return router.push({
      name: 'chat',
      query: { ...route.query, agentId: aid, sessionId: sid, memberId: undefined },
    });
  }

  /** 跳转并忽略失败（重复导航、被新导航打断等），供普通交互调用。 */
  function navigateTo(aid, sid) {
    pushConversation(aid, sid).catch(() => {});
  }

  function handleAgentChange(aid) {
    router
      .push({ name: 'chat', query: { ...route.query, agentId: aid, sessionId: undefined, memberId: undefined } })
      .catch(() => {});
  }

  /**
   * “新会话”按钮：结束当前回复（如有）、清空当前会话，回到无会话状态。
   * 后续发送第一条消息时会自动创建会话。
   */
  function handleCreateSession() {
    // TODO: 回复进行中时，是否先弹确认再新建会话
    abort();
    router
      .push({ path: '/chat', query: { ...route.query, sessionId: undefined, memberId: undefined } })
      .catch(() => {});
  }

  function openRename(session) {
    renamingSession.value = session;
    renameDialogVisible.value = true;
  }

  async function handleRenameConfirm(name) {
    if (!renamingSession.value) return;
    await updateSession(renamingSession.value.session.id, agentId.value, { name });
  }

  async function openDeleteSession(session) {
    const sid = session?.session?.id;
    if (!sid) return;
    const name = session.session?.config?.name || sid;
    await MessageBox.confirm(`确定删除会话「${name}」吗？`, '删除会话', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    await removeSession(sid, agentId.value);
    if (sid === sessionId.value) {
      router.push({ name: 'chat', query: { ...route.query, sessionId: undefined } }).catch(() => {});
    }
  }

  function openEditAgent(agent) {
    editingAgent.value = agent;
    editAgentDialogVisible.value = true;
  }

  async function openDeleteAgent(agent) {
    if (!agent) return;
    const name = agent.data?.name || agent.id;
    await MessageBox.confirm(`确定删除助手「${name}」吗？`, '删除助手', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    await removeAgent(agent.id);
    // 删除当前助手后清空路由回到 /chat
    if (route.query.agentId) {
      router.push({ name: 'chat', query: {} }).catch(() => {});
    }
  }

  return {
    agentDialogVisible,
    editAgentDialogVisible,
    editingAgent,
    renameDialogVisible,
    renamingSession,
    pushConversation,
    navigateTo,
    handleAgentChange,
    handleCreateSession,
    openRename,
    handleRenameConfirm,
    openDeleteSession,
    openEditAgent,
    openDeleteAgent,
  };
}
