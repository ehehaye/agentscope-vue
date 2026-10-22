<template>
  <el-dialog
    append-to-body
    :visible.sync="dialogVisible"
    :title="sop ? '编辑流程' : '新建流程'"
    width="820px"
    :close-on-click-modal="false"
    @open="resetForm"
  >
    <el-form
      label-position="top"
      class="tw-flex tw-flex-col tw-gap-4"
    >
      <div class="tw-grid tw-grid-cols-3 tw-gap-3">
        <el-form-item
          label="流程名称"
          class="tw-col-span-2"
        >
          <el-input
            v-model="form.name"
            placeholder="例如：write-article"
          />
        </el-form-item>
        <el-form-item label="工作区粒度">
          <el-select
            v-model="form.workspace_grain"
            class="tw-w-full"
          >
            <el-option
              v-for="(label, value) in workspaceGrainLabels"
              :key="value"
              :value="value"
              :label="label"
            />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item label="流程描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="描述这个流程的用途..."
        />
      </el-form-item>

      <div>
        <div class="tw-mb-2 tw-flex tw-items-center tw-justify-between">
          <div>
            <div class="tw-text-sm tw-font-semibold">步骤</div>
            <div class="tw-text-xs tw-text-muted-foreground">按顺序执行；每一步由执行者交付，验证者验收。</div>
          </div>
          <el-button
            size="small"
            @click="addStep"
          >
            <Icon
              icon="lucide:plus"
              class="tw-mr-1 tw-h-3.5 tw-w-3.5"
            />
            添加步骤
          </el-button>
        </div>

        <div class="tw-space-y-3">
          <div
            v-for="(step, index) in form.steps"
            :key="index"
            class="tw-rounded-lg tw-border tw-border-border tw-p-3"
          >
            <div class="tw-mb-2 tw-flex tw-items-center tw-justify-between">
              <span class="tw-text-sm tw-font-medium">第 {{ index + 1 }} 步</span>
              <el-button
                type="text"
                size="mini"
                :disabled="form.steps.length <= 1"
                @click="removeStep(index)"
              >
                <Icon
                  icon="lucide:trash-2"
                  class="tw-h-3.5 tw-w-3.5"
                />
              </el-button>
            </div>

            <div class="tw-grid tw-grid-cols-2 tw-gap-3">
              <el-form-item label="步骤名称">
                <el-input
                  v-model="step.subject"
                  placeholder="例如：撰写初稿"
                />
              </el-form-item>
              <el-form-item label="最大尝试次数">
                <el-input-number
                  v-model="step.max_attempts"
                  :min="1"
                  :max="99"
                  class="tw-w-full"
                />
              </el-form-item>
            </div>

            <el-form-item label="步骤说明">
              <el-input
                v-model="step.description"
                type="textarea"
                :rows="2"
                placeholder="这一步必须达成的结果..."
              />
            </el-form-item>

            <div class="tw-grid tw-grid-cols-2 tw-gap-3">
              <el-form-item label="执行者">
                <AgentSelect
                  :agents="agents"
                  :value="step.executor.agent_id"
                  placeholder="选择执行智能体"
                  @change="(id) => (step.executor.agent_id = id)"
                />
              </el-form-item>
              <el-form-item label="执行者会话键">
                <el-input
                  v-model="step.executor.session_key"
                  placeholder="例如：writer"
                />
              </el-form-item>
            </div>

            <el-form-item label="验证者">
              <el-radio-group v-model="step.verifier.type">
                <el-radio label="none">无需验收</el-radio>
                <el-radio label="agent">智能体验收</el-radio>
                <el-radio label="human">人工验收</el-radio>
              </el-radio-group>
            </el-form-item>

            <template v-if="step.verifier.type === 'agent'">
              <div class="tw-grid tw-grid-cols-2 tw-gap-3">
                <el-form-item label="验证智能体">
                  <AgentSelect
                    :agents="agents"
                    :value="step.verifier.agent.agent_id"
                    placeholder="选择验证智能体"
                    @change="(id) => (step.verifier.agent.agent_id = id)"
                  />
                </el-form-item>
                <el-form-item label="验证者会话键">
                  <el-input
                    v-model="step.verifier.agent.session_key"
                    placeholder="例如：reviewer"
                  />
                </el-form-item>
              </div>
              <el-form-item label="额外验收标准">
                <el-input
                  v-model="step.verifier.criteria"
                  type="textarea"
                  :rows="2"
                  placeholder="可选，会原样交给验证智能体..."
                />
              </el-form-item>
            </template>

            <el-form-item
              v-if="step.verifier.type === 'human'"
              label="验收问题"
            >
              <el-input
                v-model="step.verifier.question"
                placeholder="例如：终稿可以发布吗？"
              />
            </el-form-item>
          </div>
        </div>
      </div>

      <div>
        <div class="tw-mb-2">
          <div class="tw-text-sm tw-font-semibold">会话设置</div>
          <div class="tw-text-xs tw-text-muted-foreground">
            每个会话键对应一个会话，需配置模型与权限模式；同一个会话键只能属于一个智能体。
          </div>
        </div>

        <div class="tw-space-y-3">
          <div
            v-for="ref in sessionKeys"
            :key="ref.key"
            class="tw-rounded-lg tw-border tw-border-border tw-p-3"
          >
            <div class="tw-mb-2 tw-flex tw-items-center tw-gap-2">
              <span class="tw-font-mono tw-text-sm tw-font-medium">{{ ref.key }}</span>
              <span class="tw-text-xs tw-text-muted-foreground">
                {{ agentName(ref.agent_id) }} · {{ ref.roles.join(' / ') }}
              </span>
            </div>
            <div class="tw-grid tw-grid-cols-3 tw-gap-3">
              <el-form-item label="主模型">
                <LlmSelect
                  :value="settingsFor(ref.key).chat_model_config"
                  placeholder="选择主模型"
                  @change="(value) => (settingsFor(ref.key).chat_model_config = value)"
                />
              </el-form-item>
              <el-form-item label="备用模型">
                <LlmSelect
                  :value="settingsFor(ref.key).fallback_chat_model_config"
                  placeholder="可选"
                  clearable
                  @change="(value) => (settingsFor(ref.key).fallback_chat_model_config = value)"
                />
              </el-form-item>
              <el-form-item label="权限模式">
                <PermissionModeSelect
                  :value="settingsFor(ref.key).permission_mode"
                  @change="(value) => (settingsFor(ref.key).permission_mode = value)"
                />
              </el-form-item>
            </div>

            <div class="tw-grid tw-grid-cols-3 tw-gap-3">
              <el-form-item label="主模型思考模式">
                <el-switch
                  :value="thinkingEnabled(ref.key, 'primary')"
                  :disabled="!settingsFor(ref.key).chat_model_config"
                  @change="(value) => setThinkingEnabled(ref.key, 'primary', value)"
                />
              </el-form-item>
              <el-form-item label="备用模型思考模式">
                <el-switch
                  :value="thinkingEnabled(ref.key, 'fallback')"
                  :disabled="!settingsFor(ref.key).fallback_chat_model_config"
                  @change="(value) => setThinkingEnabled(ref.key, 'fallback', value)"
                />
              </el-form-item>
            </div>
          </div>
        </div>
      </div>

      <p
        v-if="error"
        class="tw-whitespace-pre-wrap tw-text-sm tw-text-destructive"
      >
        {{ error }}
      </p>
    </el-form>

    <span
      slot="footer"
      class="tw-dialog-footer"
    >
      <el-button
        size="small"
        :disabled="saving"
        @click="dialogVisible = false"
        >取消</el-button
      >
      <el-button
        size="small"
        type="primary"
        :loading="saving"
        @click="handleSave"
      >
        {{ saving ? '保存中…' : '保存' }}
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch, set } from '@/composables/vue';
import Icon from '@/components/ui/Icon';
import AgentSelect from '@/components/select/AgentSelect.vue';
import PermissionModeSelect from '@/components/select/PermissionModeSelect.vue';
import LlmSelect from '@/components/select/LlmSelect.vue';
import { sopApi } from '@/api';
import {
  SOP_WORKSPACE_GRAIN_LABELS,
  buildSopData,
  collectSessionRefs,
  createEmptyForm,
  createEmptyStep,
  formFromData,
  validateSopForm,
} from '@/utils/sop';

function ensureSessionSettings(model) {
  const keys = [...new Set(collectSessionRefs(model).map((ref) => ref.session_key))];
  keys.forEach((key) => {
    if (!model.session_settings[key]) {
      model.session_settings[key] = {
        chat_model_config: null,
        fallback_chat_model_config: null,
        permission_mode: 'default',
      };
    }
  });
}

export default defineComponent({
  name: 'SopEditorDialog',
  components: { Icon, AgentSelect, PermissionModeSelect, LlmSelect },
  props: {
    visible: { type: Boolean, default: false },
    sop: { type: Object, default: null },
    agents: { type: Array, default: () => [] },
  },
  setup(props, { emit }) {
    const form = ref(createEmptyForm());
    const saving = ref(false);
    const error = ref('');

    const workspaceGrainLabels = SOP_WORKSPACE_GRAIN_LABELS;

    const sessionKeys = computed(() => {
      const byKey = new Map();
      collectSessionRefs(form.value).forEach((ref) => {
        if (!ref.session_key) return;
        if (!byKey.has(ref.session_key)) {
          byKey.set(ref.session_key, {
            key: ref.session_key,
            agent_id: ref.agent_id,
            roles: [],
          });
        }
        const entry = byKey.get(ref.session_key);
        const role = ref.role === 'executor' ? '执行者' : '验证者';
        if (!entry.agent_id && ref.agent_id) entry.agent_id = ref.agent_id;
        if (!entry.roles.includes(role)) entry.roles.push(role);
      });
      return [...byKey.values()];
    });

    watch(
      sessionKeys,
      (list) => {
        list.forEach(({ key }) => {
          if (!form.value.session_settings[key]) {
            set(form.value.session_settings, key, {
              chat_model_config: null,
              fallback_chat_model_config: null,
              permission_mode: 'default',
            });
          }
        });
      },
      { immediate: true },
    );

    const dialogVisible = computed({
      get: () => props.visible,
      set: (value) => emit('update:visible', value),
    });

    function resetForm() {
      const model = props.sop ? formFromData(props.sop.data) : createEmptyForm(props.agents[0]?.id || '');
      ensureSessionSettings(model);
      form.value = model;
      error.value = '';
      saving.value = false;
    }

    watch(
      () => props.visible,
      (open) => {
        if (open) resetForm();
      },
    );

    function agentName(agentId) {
      const agent = props.agents.find((item) => item.id === agentId);
      return agent?.data?.name || agentId || '未选择智能体';
    }

    function settingsFor(key) {
      return form.value.session_settings[key] ?? {};
    }

    /**
     * ChatModelConfig.parameters 里各 provider 共有的只有 thinking_enable，故这里只暴露它。
     * 其余字段随模型不同而变化（由模型卡的 parameter_schema 决定），包括：
     *   max_tokens / temperature / top_p / top_k / parallel_tool_calls / voice
     *   thinking_budget / thinking_mode / thinking_display / reasoning_effort
     * 需要完整调参面板时可复用 components/popover/ModelParametersPopover.vue。
     */
    function modelConfigFor(key, slot) {
      const settings = settingsFor(key);
      return slot === 'fallback' ? settings.fallback_chat_model_config : settings.chat_model_config;
    }

    function thinkingEnabled(key, slot) {
      return modelConfigFor(key, slot)?.parameters?.thinking_enable === true;
    }

    function setThinkingEnabled(key, slot, value) {
      const config = modelConfigFor(key, slot);
      if (!config) return;
      if (!config.parameters) set(config, 'parameters', {});
      set(config.parameters, 'thinking_enable', value);
    }

    function addStep() {
      form.value.steps.push(createEmptyStep(props.agents[0]?.id || ''));
    }

    function removeStep(index) {
      form.value.steps.splice(index, 1);
    }

    async function handleSave() {
      const validationError = validateSopForm(form.value);
      if (validationError) {
        error.value = validationError;
        return;
      }

      error.value = '';
      saving.value = true;
      try {
        const data = buildSopData(form.value);
        let sopId = props.sop?.id;
        if (sopId) {
          await sopApi.update(sopId, data);
        } else {
          const res = await sopApi.create(data);
          sopId = res?.sop_id;
        }
        emit('saved', sopId);
        dialogVisible.value = false;
      } catch (e) {
        error.value = e?.message || String(e);
      } finally {
        saving.value = false;
      }
    }

    return {
      form,
      saving,
      error,
      workspaceGrainLabels,
      sessionKeys,
      dialogVisible,
      resetForm,
      agentName,
      settingsFor,
      thinkingEnabled,
      setThinkingEnabled,
      addStep,
      removeStep,
      handleSave,
    };
  },
});
</script>
