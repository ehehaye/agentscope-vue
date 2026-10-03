<template>
  <main class="tw-relative tw-flex tw-h-full tw-w-full tw-gap-2 tw-p-2">
    <SessionList
      class="tw-h-full tw-shrink-0"
      :agents="agents"
      :agent-id="agentId"
      :sessions="sessions"
      :session-id="sessionId"
      :sessions-loading="sessionsLoading"
      @agent-change="handleAgentChange"
      @create-agent="agentDialogVisible = true"
      @edit-agent="openEditAgent($event)"
      @delete-agent="openDeleteAgent($event)"
      @create-session="handleCreateSession"
      @session-change="navigateTo(agentId, $event)"
      @rename-session="openRename($event)"
      @delete-session="openDeleteSession($event)"
    />
    <div class="tw-flex tw-flex-1 tw-overflow-hidden tw-rounded-22px tw-bg-card tw-shadow-panel">
      <div class="tw-flex tw-h-full tw-w-full tw-min-w-0 tw-flex-col tw-p-2">
        <!-- top bar -->
        <div class="tw-mb-2 tw-flex tw-items-center tw-justify-between tw-gap-2 tw-px-2">
          <div class="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-2">
            <!-- 会话连接状态 -->
            <div class="tw-flex tw-min-w-0 tw-items-center tw-gap-2 tw-text-sm">
              <ConnectionStatus :connection="connection" />
              <el-tag
                v-if="focusedMember"
                size="mini"
                type="info"
                class="tw-ml-1 tw-shrink-0"
              >
                成员：{{ focusedMember.agent?.data?.name }}
              </el-tag>
            </div>
          </div>
          <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-1">
            <LlmSelect
              :value="selectedModel"
              placeholder="选择模型"
              @change="handleLlmChange"
              @add-credential="credentialDialogVisible = true"
            />
            <ModelParametersPopover
              :model-config="selectedModel"
              :model-groups="modelGroups"
              :fallback-model-config="selectedFallbackModel"
              :tts-model-config="selectedTTSModel"
              :disabled="!selectedModel"
              @change="handleModelParamsChange"
              @fallback-change="handleFallbackModelChange"
              @tts-change="handleTTSChange"
            />
            <PermissionModeSelect
              :value="selectedPermissionMode"
              @change="handlePermissionModeChange"
            />
            <el-dropdown
              trigger="click"
              @command="togglePanel"
            >
              <span
                class="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-border tw-px-2 tw-py-1.5 tw-text-sm hover:tw-bg-row-hover"
              >
                <Icon
                  icon="lucide:panel-right"
                  class="tw-h-4 tw-w-4"
                />
                <Icon
                  icon="lucide:chevron-down"
                  class="tw-h-3 tw-w-3 tw-text-muted-foreground"
                />
              </span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item
                  v-for="item in PANEL_MENU"
                  :key="item.key"
                  :command="item.key"
                  :class="{ 'tw-bg-accent': isPanelOpen(item.key) }"
                >
                  <span class="tw-flex tw-items-center tw-gap-2">
                    <Icon
                      :icon="item.icon"
                      class="tw-h-4 tw-w-4"
                    />
                    {{ item.label }}
                  </span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>

        <!-- chat area -->
        <div class="tw-relative tw-flex tw-flex-1 tw-min-h-0 tw-justify-center">
          <ChatContent
            class="tw-w-full"
            :msgs="msgs"
            :loading="loading"
            :phase="phase"
            :error="error"
            :disabled="sendDisabled"
            :allowed-input-types="allowedInputTypes"
            :subagent-hitl="subagentHitl"
            :agent-id="effectiveAgentId"
            :session-id="effectiveSessionId"
            :cwd="cwd"
            :on-ask-user-submit="handleAskUserSubmit"
            :on-subagent-ask-user-submit="handleSubagentAskUserSubmit"
            :on-cwd-change="handleCwdChange"
            @send="handleSend"
            @user-confirm="handleUserConfirm"
            @subagent-confirm="handleSubagentConfirm"
            @interrupt="interrupt"
          />
        </div>
      </div>
    </div>

    <!-- right dock -->
    <PanelDock
      class="tw-ml-2 tw-h-full tw-w-22rem tw-shrink-0"
      :layout="panelLayout"
      :panels="panels"
      @close="closePanel"
    />

    <!-- 对话框 -->
    <AgentDialog
      :visible.sync="agentDialogVisible"
      @created="refetchAgents"
    />
    <EditAgentDialog
      :visible.sync="editAgentDialogVisible"
      :agent="editingAgent"
      @updated="refetchAgents"
    />
    <RenameSessionDialog
      :visible.sync="renameDialogVisible"
      :current-name="renamingSession?.session?.config?.name || ''"
      @confirm="handleRenameConfirm"
    />
    <CreateCredentialDialog
      :visible.sync="credentialDialogVisible"
      :create-fn="credentialApi.create"
      @created="credentialTrigger++"
    />
  </main>
</template>

<script>
import { defineComponent, ref, computed, watch, onUnmounted } from '@/composables/vue';
import { useRoute, useRouter } from '@/composables/vue-router';
import { MessageBox } from 'element-ui';
import { useMessages } from '@/composables/useMessages';
import { useSessions } from '@/composables/useSessions';
import { useAgents } from '@/composables/useAgents';
import { useWorkspace } from '@/composables/useWorkspace';
import { useWorkspaceStatus } from '@/composables/useWorkspaceStatus';
import { useKnowledgeBases } from '@/composables/useKnowledgeBases';
import { useAvailableModels } from '@/composables/useAvailableModels';
import { provideAudioCenter, useAudioCenter } from '@/composables/useAudioCenter.js';
import { credentialApi } from '@/api';
import { AppReplyPhase } from '@/constants/app-state';
import { Icon } from '@/components/ui/Icon';
import ChatContent from '@/components/chat/ChatContent.vue';
import ConnectionStatus from '@/components/chat/ConnectionStatus.vue';
import SessionList from '@/components/chat/SessionList.vue';
import PanelDock from '@/components/panel/PanelDock.vue';
import TaskPanel from '@/components/panel/TaskPanel.vue';
import McpPanel from '@/components/panel/McpPanel.vue';
import SkillPanel from '@/components/panel/SkillPanel.vue';
import PermissionPanel from '@/components/panel/PermissionPanel.vue';
import KnowledgeBasePanel from '@/components/panel/KnowledgeBasePanel.vue';
import TeamPanel from '@/components/panel/TeamPanel.vue';
import LlmSelect from '@/components/select/LlmSelect.vue';
import CreateCredentialDialog from '@/components/dialog/CreateCredentialDialog.vue';
import ModelParametersPopover from '@/components/popover/ModelParametersPopover.vue';
import AgentDialog from '@/components/dialog/AgentDialog.vue';
import EditAgentDialog from '@/components/dialog/EditAgentDialog.vue';
import RenameSessionDialog from '@/components/dialog/RenameSessionDialog.vue';
import PermissionModeSelect from '@/components/select/PermissionModeSelect.vue';
import { PANEL_MENU, usePanelLayout } from './usePanelLayout';
import { useModelConfig } from './useModelConfig';
import { useSessionManager } from './useSessionManager';

export default defineComponent({
  name: 'ChatPage',
  components: {
    Icon,
    ChatContent,
    ConnectionStatus,
    SessionList,
    PanelDock,
    LlmSelect,
    PermissionModeSelect,
    AgentDialog,
    EditAgentDialog,
    RenameSessionDialog,
    ModelParametersPopover,
    CreateCredentialDialog,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const agentId = computed(() => route.query.agentId || null);
    const sessionId = computed(() => route.query.sessionId || null);
    const memberId = computed(() => route.query.memberId || null);

    // 提供音频中心（L2）：聊天子树内 useAudioBlock 可订阅单块播放状态
    provideAudioCenter();
    const audioManager = useAudioCenter();

    const { agents, refetch: refetchAgents, remove: removeAgent } = useAgents();
    const {
      sessions,
      loading: sessionsLoading,
      refetch: refetchSessions,
      createWithInput,
      update: updateSession,
      remove: removeSession,
    } = useSessions(agentId);
    const { groups: modelGroups, refetch: refetchAvailableModels } = useAvailableModels();
    const { knowledgeBases, loading: kbLoading, refetch: refetchKnowledgeBases } = useKnowledgeBases();

    // ── 右侧面板：停靠布局 ─────────────────────────────────
    const { panelLayout, isPanelOpen, togglePanel, closePanel, openPanelInLayout } = usePanelLayout();

    // ── 面板数据：任务 / 权限上下文 ─────────────────────────
    const tasksContext = ref(null);
    const permissionContext = ref(null);
    const taskPanelOpenedFor = ref(null);

    // ── 当前会话视图 ───────────────────────────────────────
    const view = computed(() => sessions.value.find((v) => v.session?.id === sessionId.value) || null);
    const focusedMember = computed(() => {
      if (!memberId.value || !view.value?.team?.members) return null;
      return view.value.team.members.find((m) => m.agent?.id === memberId.value) || null;
    });
    const effectiveAgentId = computed(() =>
      focusedMember.value?.session_id ? focusedMember.value.agent?.id : agentId.value,
    );
    const effectiveSessionId = computed(() =>
      focusedMember.value?.session_id ? focusedMember.value.session_id : sessionId.value,
    );

    // ── 模型与参数选择 ─────────────────────────────────────
    const {
      selectedModel,
      selectedFallbackModel,
      selectedTTSModel,
      selectedPermissionMode,
      selectedKnowledgeConfig,
      pendingCwd,
      allowedInputTypes,
      sendDisabled,
      handleLlmChange,
      handleModelParamsChange,
      handleFallbackModelChange,
      handleTTSChange,
      handleCwdChange,
      handlePermissionModeChange,
      handleKnowledgeConfigChange,
    } = useModelConfig({ agentId, sessionId, view, modelGroups, refetchSessions });

    const cwd = computed(() => view.value?.session?.config?.cwd ?? pendingCwd.value ?? null);

    // ── 工作区（MCP / 技能） ────────────────────────────────
    const { status: workspaceStatus, refetch: refetchWorkspaceStatus } = useWorkspaceStatus(
      effectiveAgentId,
      effectiveSessionId,
      cwd,
    );

    const {
      mcps,
      skills,
      loading: workspaceLoading,
      addMcps,
      addMcpsFromLibrary,
      removeMcp,
      uploadSkill,
      addSkillsFromLibrary,
      removeSkill,
    } = useWorkspace(effectiveAgentId, effectiveSessionId);

    function onSessionsChanged() {
      refetchSessions();
      refetchKnowledgeBases();
    }

    async function handleTeamUpdated() {
      const next = await refetchSessions();
      if (next.some((v) => v.session?.id === sessionId.value && v.team)) {
        panelLayout.value = openPanelInLayout(panelLayout.value, 'team');
      }
      onSessionsChanged();
    }

    async function handleSessionUpdated() {
      await refetchSessions();
      onSessionsChanged();
    }

    function handleStateUpdated(value) {
      if (value?.tasks_context) {
        tasksContext.value = value.tasks_context;
        if (value.tasks_context.tasks?.length > 0 && taskPanelOpenedFor.value !== sessionId.value) {
          taskPanelOpenedFor.value = sessionId.value;
          panelLayout.value = openPanelInLayout(panelLayout.value, 'plan');
        }
      }
      if (value?.permission_context) {
        permissionContext.value = value.permission_context;
      }
    }

    // ── 消息流（SSE） ──────────────────────────────────────
    const {
      msgs,
      connection,
      loading,
      phase,
      error,
      subagentHitl,
      send,
      onUserConfirm,
      onSubagentConfirm,
      onAskUserSubmit,
      onSubagentAskUserSubmit,
      interrupt,
      abort,
      discardPendingInput,
    } = useMessages(effectiveAgentId, effectiveSessionId, {
      onTeamUpdated: handleTeamUpdated,
      onStateUpdated: handleStateUpdated,
      onSessionUpdated: handleSessionUpdated,
      onAudioStart: (blockId, mediaType) => audioManager?.start(blockId, mediaType),
      onAudioAppend: (blockId, data) => audioManager?.append(blockId, data),
      onAudioEnd: (blockId) => audioManager?.end(blockId),
      onAudioStopAll: () => audioManager?.stopAllPlayback(),
    });

    watch(phase, (next, prev) => {
      // 一轮回复结束（本应用的 AppReplyPhase 从非 idle 回到 idle）后刷新工作区状态
      if (prev !== AppReplyPhase.IDLE && next === AppReplyPhase.IDLE) {
        refetchWorkspaceStatus();
      }
    });

    // ── 会话 / Agent 管理 ──────────────────────────────────
    const {
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
    } = useSessionManager({
      route,
      router,
      agentId,
      sessionId,
      updateSession,
      removeSession,
      removeAgent,
      abort,
    });

    /**
     * 从内容块中提取会话标题（取文本内容，最长 50 字符）。
     */
    function extractTitle(contentBlocks) {
      const text = (contentBlocks || [])
        .filter((b) => b.type === 'text')
        .slice(0, 1)
        .map((b) => b.text || '')
        .join(' ')
        .trim();
      if (!text) return '';
      return text.length > 50 ? text.slice(0, 50) : text;
    }

    /**
     * 根据当前选择构造创建会话的请求体。
     */
    function buildSessionBody(title) {
      const body = { agent_id: agentId.value };
      if (selectedModel.value) body.chat_model_config = selectedModel.value;
      if (selectedFallbackModel.value) body.fallback_chat_model_config = selectedFallbackModel.value;
      if (selectedTTSModel.value) body.tts_model_config = selectedTTSModel.value;
      if (selectedPermissionMode.value && selectedPermissionMode.value !== 'default') {
        body.permission_mode = selectedPermissionMode.value;
      }
      if (selectedKnowledgeConfig.value) body.knowledge_config = selectedKnowledgeConfig.value;
      if (pendingCwd.value) body.cwd = pendingCwd.value;
      if (title) body.name = title;
      return body;
    }

    /**
     * 发送消息入口：
     * - 已有会话：直接发送。
     * - 无会话：以消息为标题创建会话并选中。首条消息由 createWithInput 暂存到
     *   chat 模块，待新会话 SSE 订阅建立后由其补发，避免回复事件丢失。
     */
    async function handleSend(contentBlocks) {
      if (sessionId.value) {
        send(contentBlocks);
        return;
      }
      if (!agentId.value) return;
      try {
        const title = extractTitle(contentBlocks);
        const newSessionId = await createWithInput(buildSessionBody(title), contentBlocks);
        await pushConversation(agentId.value, newSessionId);
      } catch (e) {
        console.error('Failed to create session for sending', e);
        // 会话已创建但没能打开：回收暂存的首条消息并提示，避免消息静默丢失
        if (await discardPendingInput()) {
          MessageBox.alert('新会话未能打开，消息未发送。', '发送失败', { type: 'error' }).catch(() => {});
        }
      }
    }

    function handleUserConfirm({ toolCall, confirm, replyId, rules }) {
      onUserConfirm(toolCall, confirm, replyId, rules);
    }

    function handleSubagentConfirm({ entry, toolCall, confirm, rules }) {
      onSubagentConfirm(entry, toolCall, confirm, rules);
    }

    function handleAskUserSubmit(toolCall, replyId, answers) {
      return onAskUserSubmit(toolCall, replyId, answers);
    }

    function handleSubagentAskUserSubmit(entry, toolCall, answers) {
      return onSubagentAskUserSubmit(entry, toolCall, answers);
    }

    // ── 面板数据：随会话切换重置 / 从会话状态播种 ────────────
    const credentialDialogVisible = ref(false);
    const credentialTrigger = ref(0);
    watch(credentialTrigger, () => {
      refetchAvailableModels();
    });

    watch(sessionId, () => {
      tasksContext.value = null;
      permissionContext.value = null;
    });

    let seededSessionId = null;
    watch(
      view,
      (nextView) => {
        if (!nextView) {
          seededSessionId = null;
          tasksContext.value = null;
          permissionContext.value = null;
          return;
        }
        if (seededSessionId === nextView.session.id) return;
        seededSessionId = nextView.session.id;
        const state = nextView.session.state || {};
        tasksContext.value = state.tasks_context || null;
        permissionContext.value = state.permission_context || null;
      },
      { immediate: true },
    );

    // ── 右侧面板：注册表 ───────────────────────────────────
    const panels = computed(() => ({
      plan: {
        title: '任务',
        icon: 'lucide:list-todo',
        component: TaskPanel,
        props: { tasksContext: tasksContext.value },
      },
      mcp: {
        title: 'MCP',
        icon: 'lucide:plug',
        component: McpPanel,
        props: {
          mcps: mcps.value,
          loading: workspaceLoading.value,
          onAdd: addMcps,
          onAddFromLibrary: addMcpsFromLibrary,
          onRemove: removeMcp,
        },
      },
      skill: {
        title: '技能',
        icon: 'lucide:book-text',
        component: SkillPanel,
        props: {
          skills: skills.value,
          loading: workspaceLoading.value,
          onUpload: uploadSkill,
          onAddFromLibrary: addSkillsFromLibrary,
          onRemove: removeSkill,
        },
      },
      permission: {
        title: '权限',
        icon: 'lucide:shield-check',
        component: PermissionPanel,
        props: { permissionContext: permissionContext.value },
      },
      knowledge: {
        title: '知识库',
        icon: 'lucide:database',
        component: KnowledgeBasePanel,
        props: {
          knowledgeBases: knowledgeBases.value,
          loading: kbLoading.value,
          value: selectedKnowledgeConfig.value,
          onChange: handleKnowledgeConfigChange,
          disabled: !sessionId.value,
        },
      },
      team: {
        title: '团队',
        icon: 'lucide:users-round',
        component: TeamPanel,
        props: {
          team: view.value?.team || null,
          currentAgentId: agentId.value,
          currentSessionId: effectiveSessionId.value,
          mainSessionId: sessionId.value,
        },
      },
    }));

    onUnmounted(() => {
      abort();
      audioManager?.disposeAll();
    });

    return {
      msgs,
      loading,
      phase,
      error,
      subagentHitl,
      connection,
      cwd,
      selectedModel,
      selectedFallbackModel,
      selectedTTSModel,
      selectedPermissionMode,
      modelGroups,
      panelLayout,
      panels,
      allowedInputTypes,
      sendDisabled,
      PANEL_MENU,
      handleLlmChange,
      handleModelParamsChange,
      handleFallbackModelChange,
      handleTTSChange,
      handleCwdChange,
      handlePermissionModeChange,
      handleUserConfirm,
      handleSubagentConfirm,
      handleAskUserSubmit,
      handleSubagentAskUserSubmit,
      handleSend,
      send,
      interrupt,
      isPanelOpen,
      togglePanel,
      closePanel,
      // Agent / 会话管理
      agents,
      agentId,
      sessions,
      sessionsLoading,
      sessionId,
      memberId,
      effectiveAgentId,
      effectiveSessionId,
      focusedMember,
      agentDialogVisible,
      editAgentDialogVisible,
      editingAgent,
      renameDialogVisible,
      renamingSession,
      handleAgentChange,
      handleCreateSession,
      navigateTo,
      openRename,
      handleRenameConfirm,
      openDeleteSession,
      openEditAgent,
      openDeleteAgent,
      refetchAgents,
      credentialDialogVisible,
      credentialApi,
      credentialTrigger,
    };
  },
});
</script>
