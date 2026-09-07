<template>
  <main class="flex h-full w-full gap-2 p-2">
    <SessionList
      class="h-full shrink-0"
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
    <div class="flex flex-1 overflow-hidden rounded-[22px] bg-card shadow-panel">
      <div class="flex h-full w-full min-w-0 flex-col p-2">
        <!-- top bar -->
        <div class="mb-2 flex items-center justify-between gap-2 px-2">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <!-- Agent 选择 -->
            <div class="flex min-w-0 items-center gap-2 text-sm">
              <Icon icon="lucide:message-square" class="h-4 w-4 shrink-0 text-muted-foreground" />
              <span class="truncate font-medium">{{ sessionName || TEXT.noSession }}</span>
              <el-tag v-if="focusedMember" size="mini" type="info" class="ml-1 shrink-0">
                成员：{{ focusedMember.agent?.data?.name }}
              </el-tag>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
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
            <el-dropdown trigger="click" @command="togglePanel">
              <span class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1.5 text-sm hover:bg-row-hover">
                <Icon icon="lucide:panel-right" class="h-4 w-4" />
                <Icon icon="lucide:chevron-down" class="h-3 w-3 text-muted-foreground" />
              </span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item
                  v-for="item in PANEL_MENU"
                  :key="item.key"
                  :command="item.key"
                  :class="{ 'bg-accent': isPanelOpen(item.key) }"
                >
                  <span class="flex items-center gap-2">
                    <Icon :icon="item.icon" class="h-4 w-4" />
                    {{ item.label }}
                  </span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>

        <!-- chat area -->
        <div class="relative flex flex-1 min-h-0 justify-center">
          <ChatContent
            class="w-full max-w-[48rem]"
            :msgs="msgs"
            :loading="loading"
            :phase="phase"
            :disabled="sendDisabled"
            :allowed-input-types="allowedInputTypes"
            :subagent-hitl="subagentHitl"
            :agent-id="effectiveAgentId"
            :session-id="effectiveSessionId"
            :cwd="cwd"
            @send="send"
            @user-confirm="handleUserConfirm"
            @subagent-confirm="handleSubagentConfirm"
            @interrupt="interrupt"
            @cwd-change="handleCwdChange"
          />
        </div>
      </div>
    </div>

    <!-- right dock -->
    <PanelDock
      class="ml-2 h-full w-[22rem] shrink-0"
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
    <DeleteDialog
      :visible.sync="deleteSessionOpen"
      title="删除会话"
      :description="sessionToDelete ? `确定删除会话「${sessionToDelete.session?.config?.name || sessionToDelete.session?.id}」吗？` : ''"
      @confirm="confirmDeleteSession"
    />
    <DeleteDialog
      :visible.sync="deleteAgentOpen"
      title="删除助手"
      :description="agentToDelete ? `确定删除助手「${agentToDelete.name || agentToDelete.id}」吗？` : ''"
      @confirm="confirmDeleteAgent"
    />
    <CreateCredentialDialog
      :visible.sync="credentialDialogVisible"
      :create-fn="credentialApi.create"
      @created="credentialTrigger++"
    />
  </main>
</template>

<script>
import { defineComponent, ref, computed, watch, onUnmounted } from '@vue/composition-api';
import { useRoute, useRouter } from '@/composables/vue-router';
import { useMessages } from '@/composables/useMessages';
import { useSessions } from '@/composables/useSessions';
import { useAgents } from '@/composables/useAgents';
import { useWorkspace } from '@/composables/useWorkspace';
import { useWorkspaceStatus } from '@/composables/useWorkspaceStatus';
import { useKnowledgeBases } from '@/composables/useKnowledgeBases';
import { useAvailableModels } from '@/composables/useAvailableModels';
import { provideAudioCenter, useAudioCenter } from '@/composables/useAudioCenter.js';
import { sessionApi, credentialApi } from '@/api';
import { Icon } from '@iconify/vue2';
import ChatContent from '@/components/chat/ChatContent.vue';
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
import DeleteDialog from '@/components/dialog/DeleteDialog.vue';
import PermissionModeSelect from '@/components/select/PermissionModeSelect.vue';

export const TEXT = {
  noSession: '请选择会话',
};

const PANEL_LAYOUT_KEY = 'chat_panel_layout';
const MAX_PANELS_PER_COLUMN = 2;

const PANEL_MENU = [
  { key: 'plan', label: '任务', icon: 'lucide:list-todo' },
  { key: 'mcp', label: 'MCP', icon: 'lucide:plug' },
  { key: 'skill', label: '技能', icon: 'lucide:book-text' },
  { key: 'permission', label: '权限', icon: 'lucide:shield-check' },
  { key: 'knowledge', label: '知识库', icon: 'lucide:database' },
  { key: 'team', label: '团队', icon: 'lucide:users-round' },
];

const KNOWN_PANELS = new Set(PANEL_MENU.map((i) => i.key));

function loadLayout() {
  try {
    const raw = JSON.parse(localStorage.getItem(PANEL_LAYOUT_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .map((column) => (Array.isArray(column) ? column.filter((k) => KNOWN_PANELS.has(k)) : []))
      .filter((column) => column.length > 0);
  } catch {
    return [];
  }
}

function saveLayout(layout) {
  try {
    localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

function openPanel(layout, key) {
  if (layout.some((column) => column.includes(key))) return layout;
  const idx = layout.findIndex((column) => column.length < MAX_PANELS_PER_COLUMN);
  if (idx === -1) return [...layout, [key]];
  return layout.map((column, i) => (i === idx ? [...column, key] : column));
}

function closePanelInLayout(layout, key) {
  return layout
    .map((column) => column.filter((k) => k !== key))
    .filter((column) => column.length > 0);
}

export default defineComponent({
  name: 'ChatPage',
  components: {
    Icon,
    ChatContent,
    SessionList,
    PanelDock,
    LlmSelect,
    PermissionModeSelect,
    AgentDialog,
    EditAgentDialog,
    RenameSessionDialog,
    DeleteDialog,
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
      create: createSession,
      update: updateSession,
      remove: removeSession,
    } = useSessions(agentId);
    const { groups: modelGroups, refetch: refetchAvailableModels } = useAvailableModels();
    const { knowledgeBases, loading: kbLoading, refetch: refetchKnowledgeBases } = useKnowledgeBases();

    const selectedModel = ref(null);
    const selectedFallbackModel = ref(null);
    const selectedTTSModel = ref(null);
    const selectedPermissionMode = ref('default');
    const selectedKnowledgeConfig = ref(null);
    const tasksContext = ref(null);
    const permissionContext = ref(null);
    const configPending = ref(false);
    const panelLayout = ref(loadLayout());
    const taskPanelOpenedFor = ref(null);

    // 会话/Agent 管理状态
    const agentDialogVisible = ref(false);
    const editAgentDialogVisible = ref(false);
    const editingAgent = ref(null);
    const renameDialogVisible = ref(false);
    const renamingSession = ref(null);
    const deleteSessionOpen = ref(false);
    const sessionToDelete = ref(null);
    const deleteAgentOpen = ref(false);
    const agentToDelete = ref(null);
    const credentialDialogVisible = ref(false);
    const credentialTrigger = ref(0);
    watch(credentialTrigger, () => {
      refetchAvailableModels();
    });

    watch(panelLayout, saveLayout, { deep: true });

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
    const sessionName = computed(() => view.value?.session?.config?.name || route.query.name || '');
    const cwd = computed(() => view.value?.session?.config?.cwd ?? null);

    function navigateTo(aid, sid) {
      router.push({ path: '/chat', query: { ...route.query, agentId: aid, sessionId: sid, memberId: undefined } }).catch(() => {});
    }

    function handleAgentChange(aid) {
      router.push({ path: '/chat', query: { ...route.query, agentId: aid, sessionId: undefined, memberId: undefined } }).catch(() => {});
    }

    function handleSessionCommand(command) {
      if (command === '__new__') {
        handleCreateSession();
      } else {
        navigateTo(agentId.value, command);
      }
    }

    async function handleCreateSession() {
      if (!agentId.value) return;
      try {
        const seedConfig = view.value?.session?.config ?? sessions.value[0]?.session?.config;
        const body = { agent_id: agentId.value };
        if (seedConfig?.chat_model_config) body.chat_model_config = seedConfig.chat_model_config;
        if (seedConfig?.fallback_chat_model_config) body.fallback_chat_model_config = seedConfig.fallback_chat_model_config;
        if (seedConfig?.tts_model_config) body.tts_model_config = seedConfig.tts_model_config;
        const res = await createSession(body);
        navigateTo(agentId.value, res.session_id);
      } catch (e) {
        console.error('Failed to create session', e);
      }
    }

    function openRename(session) {
      renamingSession.value = session;
      renameDialogVisible.value = true;
    }

    async function handleRenameConfirm(name) {
      if (!renamingSession.value) return;
      await updateSession(renamingSession.value.session.id, agentId.value, { name });
    }

    function openDeleteSession(session) {
      sessionToDelete.value = session;
      deleteSessionOpen.value = true;
    }

    async function confirmDeleteSession() {
      if (!sessionToDelete.value) return;
      const sid = sessionToDelete.value.session.id;
      await removeSession(sid, agentId.value);
      deleteSessionOpen.value = false;
      sessionToDelete.value = null;
      if (sid === sessionId.value) {
        const remaining = sessions.value.filter((v) => v.session?.id !== sid);
        if (remaining.length > 0) {
          navigateTo(agentId.value, remaining[0].session.id);
        } else {
          router.push({ path: '/chat', query: { ...route.query, sessionId: undefined } }).catch(() => {});
        }
      }
    }

    function openEditAgent(agent) {
      editingAgent.value = agent;
      editAgentDialogVisible.value = true;
    }

    function openDeleteAgent(agent) {
      agentToDelete.value = agent;
      deleteAgentOpen.value = true;
    }

    async function confirmDeleteAgent() {
      if (!agentToDelete.value) return;
      await removeAgent(agentToDelete.value.id);
      deleteAgentOpen.value = false;
      agentToDelete.value = null;
      // 删除当前助手后清空路由回到 /chat
      if (route.query.agentId) {
        router.push({ path: '/chat', query: {} }).catch(() => {});
      }
    }

    const {
      status: workspaceStatus,
      refetch: refetchWorkspaceStatus,
    } = useWorkspaceStatus(effectiveAgentId, effectiveSessionId, cwd);

    const {
      mcps,
      skills,
      loading: workspaceLoading,
      removeMcp,
      removeSkill,
    } = useWorkspace(effectiveAgentId, effectiveSessionId);

    function onSessionsChanged() {
      refetchSessions();
      refetchKnowledgeBases();
    }

    async function handleTeamUpdated() {
      const next = await refetchSessions();
      if (next.some((v) => v.session?.id === sessionId.value && v.team)) {
        panelLayout.value = openPanel(panelLayout.value, 'team');
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
        if (
          value.tasks_context.tasks?.length > 0 &&
          taskPanelOpenedFor.value !== sessionId.value
        ) {
          taskPanelOpenedFor.value = sessionId.value;
          panelLayout.value = openPanel(panelLayout.value, 'plan');
        }
      }
      if (value?.permission_context) {
        permissionContext.value = value.permission_context;
      }
    }

    const {
      msgs,
      loading,
      phase,
      subagentHitl,
      send,
      onUserConfirm,
      onSubagentConfirm,
      interrupt,
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
      if (prev !== 'idle' && next === 'idle') {
        refetchWorkspaceStatus();
      }
    });

    function getFirstAvailableModel() {
      const types = Object.keys(modelGroups.value);
      if (types.length === 0) return null;
      const items = modelGroups.value[types[0]];
      if (!items || items.length === 0) return null;
      const first = items[0];
      const model = first.models?.[0];
      if (!model) return null;
      return {
        type: types[0],
        credential_id: first.credential.id,
        model: model.name,
        parameters: {},
      };
    }

    function selectedModelCard() {
      if (!selectedModel.value) return null;
      const items = modelGroups.value[selectedModel.value.type];
      if (!items) return null;
      for (const group of items) {
        if (group.credential.id !== selectedModel.value.credential_id) continue;
        return group.models.find((m) => m.name === selectedModel.value.model) || null;
      }
      return null;
    }

    const allowedInputTypes = computed(() => {
      const card = selectedModelCard();
      const types = card?.input_types ?? [];
      return types.filter(
        (t) =>
          /^(image|video|audio|text)\/.+/.test(t) ||
          t === 'application/pdf' ||
          t.startsWith('application/vnd.') ||
          t.startsWith('application/msword') ||
          t.startsWith('application/vnd.openxmlformats'),
      );
    });

    const sendDisabled = computed(() => !sessionId.value || !selectedModel.value);

    async function patchConfig(body, apply) {
      if (!sessionId.value || !agentId.value) return;
      configPending.value = true;
      try {
        await sessionApi.update(sessionId.value, agentId.value, body, { silent: true });
        apply();
        await refetchSessions();
      } finally {
        configPending.value = false;
      }
    }

    async function handleLlmChange(config) {
      if (!config) return;
      await patchConfig({ chat_model_config: config }, () => {
        selectedModel.value = config;
      });
    }

    async function handleModelParamsChange(parameters) {
      if (!selectedModel.value) return;
      const config = { ...selectedModel.value, parameters };
      await patchConfig({ chat_model_config: config }, () => {
        selectedModel.value = config;
      });
    }

    async function handleFallbackModelChange(config) {
      await patchConfig({ fallback_chat_model_config: config }, () => {
        selectedFallbackModel.value = config;
      });
    }

    async function handleTTSChange(config) {
      await patchConfig({ tts_model_config: config }, () => {
        selectedTTSModel.value = config;
      });
    }

    async function handleCwdChange(cwdValue) {
      await patchConfig({ cwd: cwdValue }, () => {});
    }

    async function handlePermissionModeChange(mode) {
      await patchConfig({ permission_mode: mode }, () => {
        selectedPermissionMode.value = mode;
      });
    }

    async function handleKnowledgeConfigChange(next) {
      await patchConfig({ knowledge_config: next }, () => {
        selectedKnowledgeConfig.value = next;
      });
    }

    watch(sessionId, () => {
      selectedModel.value = null;
      selectedPermissionMode.value = 'default';
      selectedKnowledgeConfig.value = null;
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

    watch(
      view,
      (nextView) => {
        if (!nextView || !sessionId.value || !agentId.value) return;
        const config = nextView.session.config || {};
        if (config.chat_model_config) {
          selectedModel.value = config.chat_model_config;
        } else {
          const first = getFirstAvailableModel();
          if (first) {
            selectedModel.value = first;
            sessionApi
              .update(sessionId.value, agentId.value, { chat_model_config: first }, { silent: true })
              .then(() => refetchSessions())
              .catch(() => {});
          }
        }
        selectedFallbackModel.value = config.fallback_chat_model_config ?? null;
        selectedTTSModel.value = config.tts_model_config ?? null;
        selectedKnowledgeConfig.value = config.knowledge_config ?? null;
      },
      { immediate: true },
    );

    watch(
      view,
      (nextView) => {
        if (!nextView) return;
        const mode = nextView.session.state?.permission_context?.mode;
        selectedPermissionMode.value = mode || 'default';
      },
      { immediate: true },
    );

    function isPanelOpen(key) {
      return panelLayout.value.some((column) => column.includes(key));
    }

    function togglePanel(key) {
      panelLayout.value = isPanelOpen(key)
        ? closePanelInLayout(panelLayout.value, key)
        : openPanel(panelLayout.value, key);
    }

    function closePanel(key) {
      panelLayout.value = closePanelInLayout(panelLayout.value, key);
    }

    function handleUserConfirm({ toolCall, confirm, replyId, rules }) {
      onUserConfirm(toolCall, confirm, replyId, rules);
    }

    function handleSubagentConfirm({ entry, toolCall, confirm, rules }) {
      onSubagentConfirm(entry, toolCall, confirm, rules);
    }

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
        props: { mcps: mcps.value, loading: workspaceLoading.value, onRemove: removeMcp },
      },
      skill: {
        title: '技能',
        icon: 'lucide:book-text',
        component: SkillPanel,
        props: { skills: skills.value, loading: workspaceLoading.value, onRemove: removeSkill },
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
        props: { team: view.value?.team || null, currentAgentId: agentId.value, currentSessionId: effectiveSessionId.value },
      },
    }));

    onUnmounted(() => {
      audioManager?.disposeAll();
    });

    return {
      msgs,
      loading,
      phase,
      subagentHitl,
      sessionName,
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
      send,
      interrupt,
      isPanelOpen,
      togglePanel,
      closePanel,
      TEXT,
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
      deleteSessionOpen,
      sessionToDelete,
      deleteAgentOpen,
      agentToDelete,
      handleAgentChange,
      handleCreateSession,
      handleSessionCommand,
      navigateTo,
      openRename,
      handleRenameConfirm,
      openDeleteSession,
      confirmDeleteSession,
      openEditAgent,
      openDeleteAgent,
      confirmDeleteAgent,
      refetchAgents,
      credentialDialogVisible,
      credentialApi,
      credentialTrigger,
    };
  },
});
</script>
