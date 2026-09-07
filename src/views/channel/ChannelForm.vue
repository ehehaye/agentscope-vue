<template>
  <div class="flex flex-col gap-5">
    <div v-if="mode === 'edit'" class="flex flex-col gap-1">
      <span class="text-sm font-medium">平台类型</span>
      <span class="text-sm text-muted-foreground">{{ typeSchema?.display_name || local.channelType }}</span>
    </div>

    <div class="flex flex-col gap-1">
      <span class="text-sm font-medium">名称</span>
      <el-input v-model="local.name" placeholder="输入频道名称" />
      <p class="text-xs text-muted-foreground">显示用名称，留空则使用平台类型名</p>
    </div>

    <template v-if="mode === 'create' && credentialFields.length > 0">
      <div v-for="field in credentialFields" :key="field.key" class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ field.title }}
          <span v-if="field.required" class="text-destructive">*</span>
        </span>
        <el-input
          v-model="local.credentials[field.key]"
          :type="field.format === 'password' ? 'password' : 'text'"
          :placeholder="field.description || field.title"
        />
      </div>
    </template>

    <el-divider />

    <div class="flex flex-col gap-1">
      <span class="text-sm font-medium">模型</span>
      <LlmSelect :value="local.chatModelConfig" @change="(v) => set('chatModelConfig', v)" />
      <p class="text-xs text-muted-foreground">频道默认使用的聊天模型</p>
    </div>

    <div class="flex flex-col gap-1">
      <span class="text-sm font-medium">权限模式</span>
      <PermissionModeSelect :value="local.permissionMode" @change="(v) => set('permissionMode', v)" />
    </div>

    <el-divider />

    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium">路由规则</span>
      <span class="text-xs text-muted-foreground">按顺序匹配，默认规则永远在最后</span>
      <BindingsEditor v-model="local.bindings" :agents="agents" />
    </div>

    <el-divider />

    <div v-for="field in configFields" :key="field.key" class="flex flex-col gap-1">
      <span class="text-sm font-medium">{{ field.title }}</span>
      <span v-if="field.description" class="text-xs text-muted-foreground">{{ field.description }}</span>
      <el-switch
        v-if="field.type === 'boolean'"
        :value="local.platformConfig[field.key] ?? field.default ?? false"
        @change="(v) => setPlatformConfig(field.key, v)"
      />
      <el-input
        v-else
        :value="String(local.platformConfig[field.key] ?? field.default ?? '')"
        @input="(v) => setPlatformConfig(field.key, v)"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, computed, watch } from '@/composables/vue';
import LlmSelect from '@/components/select/LlmSelect.vue';
import PermissionModeSelect from '@/components/select/PermissionModeSelect.vue';
import BindingsEditor from './BindingsEditor.vue';

export function defaultChannelForm(agentId = '') {
  return {
    channelType: 'feishu',
    name: '',
    credentials: {},
    platformConfig: {},
    bindings: [
      {
        match_key: 'chat_id',
        match_value: '*',
        agent_id: agentId,
        session_scope: 'per_chat',
      },
    ],
    chatModelConfig: null,
    permissionMode: 'default',
  };
}

export function channelFormFromRecord(record) {
  return {
    channelType: record.channel_type,
    name: record.name ?? '',
    credentials: {},
    platformConfig: record.platform_config ?? {},
    bindings: record.routing?.bindings ?? [],
    chatModelConfig: record.session?.chat_model_config ?? null,
    permissionMode: record.session?.permission_mode ?? 'default',
  };
}

function sessionSettings(v) {
  return {
    session: {
      chat_model_config: v.chatModelConfig,
      fallback_chat_model_config: null,
      permission_mode: v.permissionMode,
    },
  };
}

export function toCreateRequest(v) {
  return {
    channel_type: v.channelType,
    name: v.name.trim() || null,
    credentials: v.credentials,
    platform_config: v.platformConfig,
    routing: { bindings: v.bindings },
    enabled: true,
    ...sessionSettings(v),
  };
}

export function toUpdateRequest(v) {
  return {
    name: v.name.trim() || null,
    platform_config: v.platformConfig,
    routing: { bindings: v.bindings },
    ...sessionSettings(v),
  };
}

export function isChannelFormValid(v, mode) {
  if (!v.name.trim()) return false;
  if (!v.chatModelConfig) return false;
  if (v.bindings.length === 0) return false;
  if (v.bindings.some((b) => !b.agent_id)) return false;
  if (mode === 'create' && !v.channelType) return false;
  return true;
}

export default defineComponent({
  name: 'ChannelForm',
  components: { LlmSelect, PermissionModeSelect, BindingsEditor },
  props: {
    value: { type: Object, required: true },
    mode: { type: String, default: 'create' },
    agents: { type: Array, default: () => [] },
    channelTypes: { type: Array, default: () => [] },
  },
  setup(props, { emit }) {
    const local = computed({
      get: () => props.value,
      set: (val) => emit('input', val),
    });

    const typeSchema = computed(() =>
      props.channelTypes.find((ct) => ct.channel_type === local.value.channelType),
    );

    const credentialFields = computed(() => {
      const schema = typeSchema.value?.credentials_schema;
      if (!schema?.properties) return [];
      const required = schema.required ?? [];
      return Object.entries(schema.properties).map(([key, def]) => ({
        key,
        title: def.title || key,
        description: def.description || '',
        format: def.format,
        required: required.includes(key),
      }));
    });

    const configFields = computed(() => {
      const schema = typeSchema.value?.config_schema;
      if (!schema?.properties) return [];
      return Object.entries(schema.properties).map(([key, def]) => ({
        key,
        title: def.title || key,
        description: def.description || '',
        type: def.type,
        default: def.default,
      }));
    });

    function set(key, val) {
      emit('input', { ...local.value, [key]: val });
    }

    function setPlatformConfig(key, val) {
      emit('input', {
        ...local.value,
        platformConfig: { ...local.value.platformConfig, [key]: val },
      });
    }

    watch(
      () => local.value.channelType,
      () => {
        if (props.mode !== 'create') return;
        emit('input', { ...local.value, credentials: {} });
      },
    );

    return { local, typeSchema, credentialFields, configFields, set, setPlatformConfig };
  },
});
</script>
