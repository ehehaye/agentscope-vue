import { ref, computed, watch } from '@/composables/vue';
import { sessionApi } from '@/api';

/**
 * 会话级模型与参数选择：主模型 / 回退模型 / TTS / 权限模式 / 知识库配置。
 *
 * - 无会话时选择仅记录在本地，作为新建会话的请求体；
 * - 已有会话时通过 patchConfig 落库并刷新会话列表；
 * - 切换会话时从会话配置回填，缺省时自动选中首个可用模型。
 *
 * @param {object} ctx
 * @param {import('@vue/composition-api').Ref} agentId 路由中的 agentId
 * @param {import('@vue/composition-api').Ref} sessionId 路由中的 sessionId
 * @param {import('@vue/composition-api').Ref} view 当前会话（useSessions 列表项）
 * @param {import('@vue/composition-api').Ref} modelGroups 可用模型分组（useAvailableModels）
 * @param {() => Promise<any[]>} refetchSessions 刷新会话列表
 */
export function useModelConfig({ agentId, sessionId, view, modelGroups, refetchSessions }) {
  const selectedModel = ref(null);
  const selectedFallbackModel = ref(null);
  const selectedTTSModel = ref(null);
  const selectedPermissionMode = ref('default');
  const selectedKnowledgeConfig = ref(null);
  // 新会话尚未落库前暂存的工作目录，创建会话时随请求体发送
  const pendingCwd = ref(null);

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

  const sendDisabled = computed(() => !agentId.value || !selectedModel.value);

  /** 已有会话时把配置增量落库；apply 在成功后回写本地状态。 */
  async function patchConfig(body, apply) {
    if (!sessionId.value || !agentId.value) return;
    await sessionApi.update(sessionId.value, agentId.value, body, { silent: true });
    apply();
    await refetchSessions();
  }

  async function handleLlmChange(config) {
    if (!config) return;
    if (sessionId.value) {
      await patchConfig({ chat_model_config: config }, () => {
        selectedModel.value = config;
      });
    } else {
      selectedModel.value = config;
    }
  }

  async function handleModelParamsChange(parameters) {
    if (!selectedModel.value) return;
    const config = { ...selectedModel.value, parameters };
    if (sessionId.value) {
      await patchConfig({ chat_model_config: config }, () => {
        selectedModel.value = config;
      });
    } else {
      selectedModel.value = config;
    }
  }

  async function handleFallbackModelChange(config) {
    if (sessionId.value) {
      await patchConfig({ fallback_chat_model_config: config }, () => {
        selectedFallbackModel.value = config;
      });
    } else {
      selectedFallbackModel.value = config;
    }
  }

  async function handleTTSChange(config) {
    if (sessionId.value) {
      await patchConfig({ tts_model_config: config }, () => {
        selectedTTSModel.value = config;
      });
    } else {
      selectedTTSModel.value = config;
    }
  }

  async function handleCwdChange(cwdValue) {
    if (sessionId.value) {
      await patchConfig({ cwd: cwdValue }, () => {});
    } else {
      pendingCwd.value = cwdValue;
    }
  }

  async function handlePermissionModeChange(mode) {
    if (sessionId.value) {
      await patchConfig({ permission_mode: mode }, () => {
        selectedPermissionMode.value = mode;
      });
    } else {
      selectedPermissionMode.value = mode;
    }
  }

  async function handleKnowledgeConfigChange(next) {
    if (sessionId.value) {
      await patchConfig({ knowledge_config: next }, () => {
        selectedKnowledgeConfig.value = next;
      });
    } else {
      selectedKnowledgeConfig.value = next;
    }
  }

  // 切换会话：重置会话级选择；无会话时保留已选模型（无则自动选首个可用），
  // 有会话时清空，等待从会话配置回填
  watch(sessionId, (newSid) => {
    selectedPermissionMode.value = 'default';
    selectedKnowledgeConfig.value = null;
    pendingCwd.value = null;
    if (!newSid) {
      if (!selectedModel.value) {
        selectedModel.value = getFirstAvailableModel();
      }
    } else {
      selectedModel.value = null;
    }
  });

  // 会话就绪后，用会话配置回填模型选择；缺省主模型时自动选中并落库
  watch(
    view,
    async (nextView) => {
      if (!nextView || !sessionId.value || !agentId.value) return;
      const config = nextView.session.config || {};
      if (config.chat_model_config) {
        selectedModel.value = config.chat_model_config;
      } else {
        const first = getFirstAvailableModel();
        if (first) {
          selectedModel.value = first;
          await sessionApi.update(sessionId.value, agentId.value, { chat_model_config: first }, { silent: true });
          await refetchSessions();
        }
      }
      selectedFallbackModel.value = config.fallback_chat_model_config ?? null;
      selectedTTSModel.value = config.tts_model_config ?? null;
      selectedKnowledgeConfig.value = config.knowledge_config ?? null;
    },
    { immediate: true },
  );

  // 权限模式跟随会话状态（会话运行中被远端更新时同步回填）
  watch(
    view,
    (nextView) => {
      if (!nextView) return;
      const mode = nextView.session.state?.permission_context?.mode;
      selectedPermissionMode.value = mode || 'default';
    },
    { immediate: true },
  );

  return {
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
  };
}
