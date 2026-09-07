<template>
  <el-popover
    placement="bottom-start"
    width="360"
    trigger="click"
    :disabled="disabled"
    popper-class="model-params-popover"
  >
    <div class="flex tw-max-h-70vh flex-col gap-3 overflow-y-auto">
      <!-- Fallback 模型 -->
      <div>
        <p class="text-sm font-medium text-foreground">Fallback 模型</p>
        <p class="text-xs text-muted-foreground">主模型失败时的备用模型</p>
      </div>
      <el-select
        :value="fallbackValueKey"
        placeholder="无"
        clearable
        size="small"
        class="w-full"
        @change="handleFallbackChange"
      >
        <el-option label="无" :value="null" />
        <el-option
          v-for="opt in fallbackOptions"
          :key="opt.key"
          :label="opt.label"
          :value="opt.key"
        />
      </el-select>

      <el-divider class="my-1" />

      <!-- TTS 模型 -->
      <div>
        <p class="text-sm font-medium text-foreground">TTS 模型</p>
        <p class="text-xs text-muted-foreground">语音合成模型</p>
      </div>
      <el-select
        :value="ttsValueKey"
        placeholder="无"
        clearable
        size="small"
        class="w-full"
        @change="handleTTSChange"
      >
        <el-option label="无" :value="null" />
        <el-option
          v-for="opt in ttsOptions"
          :key="opt.key"
          :label="opt.label"
          :value="opt.key"
        />
      </el-select>

      <el-divider class="my-1" />

      <!-- 主模型参数 -->
      <div>
        <p class="text-sm font-medium text-foreground">模型参数</p>
        <p class="text-xs text-muted-foreground">配置当前模型的推理参数</p>
      </div>
      <div v-if="entries.length === 0" class="text-xs text-muted-foreground">
        当前模型无可配置参数
      </div>
      <el-form v-else label-position="top" size="small" class="space-y-2">
        <el-form-item
          v-for="([key, prop]) in entries"
          :key="key"
          :label="prop.title || key"
          class="mb-2"
        >
          <template v-if="resolveType(prop).type === 'boolean'">
            <el-switch
              :value="values[key] !== undefined ? values[key] : prop.default"
              @change="(v) => handleChange(key, v)"
            />
          </template>
          <template v-else-if="resolveType(prop).enumValues">
            <el-select
              :value="values[key] !== undefined ? values[key] : ''"
              placeholder="选择"
              class="w-full"
              @change="(v) => handleChange(key, v)"
            >
              <el-option
                v-for="opt in resolveType(prop).enumValues"
                :key="String(opt)"
                :label="String(opt)"
                :value="opt"
              />
            </el-select>
          </template>
          <template v-else-if="resolveType(prop).type === 'number' || resolveType(prop).type === 'integer'">
            <el-input-number
              :value="values[key] !== undefined ? values[key] : undefined"
              :min="prop.minimum"
              :max="prop.maximum"
              :step="resolveType(prop).type === 'integer' ? 1 : undefined"
              :controls="false"
              class="w-full"
              @change="(v) => handleChange(key, v)"
            />
          </template>
          <template v-else>
            <el-input
              :value="values[key] !== undefined ? values[key] : ''"
              :placeholder="prop.default != null ? String(prop.default) : ''"
              @input="(v) => handleChange(key, v)"
            />
          </template>
          <p v-if="prop.description" class="mt-0.5 text-xs text-muted-foreground">
            {{ prop.description }}
          </p>
        </el-form-item>
      </el-form>
    </div>
    <el-button
      slot="reference"
      size="mini"
      icon="el-icon-setting"
      circle
      :disabled="disabled"
      title="模型参数"
    />
  </el-popover>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { useAvailableTTSModels } from '@/composables/useAvailableTTSModels';
import { credentialLabel } from '@/utils/common';

function resolveType(prop) {
  if (prop.type) {
    return { type: prop.type, enumValues: prop.enum ?? null };
  }
  for (const variant of prop.anyOf ?? []) {
    if (variant.type && variant.type !== 'null') {
      return { type: variant.type, enumValues: variant.enum ?? prop.enum ?? null };
    }
  }
  return { type: 'string', enumValues: null };
}

export default defineComponent({
  name: 'ModelParametersPopover',
  components: { Icon },
  props: {
    /** 当前模型配置 { type, credential_id, model, parameters } */
    modelConfig: { type: Object, default: null },
    /** useAvailableModels 返回的 groups */
    modelGroups: { type: Object, default: () => ({}) },
    /** 当前 fallback 模型配置 */
    fallbackModelConfig: { type: Object, default: null },
    /** 当前 TTS 模型配置 */
    ttsModelConfig: { type: Object, default: null },
    disabled: { type: Boolean, default: false },
  },
  emits: ['change', 'fallback-change', 'tts-change'],
  setup(props, { emit }) {
    const values = ref({});

    const modelCard = computed(() => {
      if (!props.modelConfig) return null;
      const items = props.modelGroups[props.modelConfig.type] || [];
      for (const { credential, models } of items) {
        if (credential.id !== props.modelConfig.credential_id) continue;
        const m = models.find((mm) => mm.name === props.modelConfig.model);
        if (m) return m;
      }
      return null;
    });

    const schema = computed(() => modelCard.value?.parameter_schema || {});
    const entries = computed(() => Object.entries(schema.value?.properties || {}));

    const { groups: ttsGroups } = useAvailableTTSModels();

    function flattenOptions(groups) {
      const opts = [];
      Object.entries(groups || {}).forEach(([type, items]) => {
        items.forEach(({ credential, models }) => {
          models.forEach((m) => {
            const key = JSON.stringify({
              type,
              credential_id: credential.id,
              model: m.name,
            });
            opts.push({
              key,
              label: `${credentialLabel(credential)} / ${m.label || m.name}`,
              type,
              credential_id: credential.id,
              model: m.name,
              card: m,
            });
          });
        });
      });
      return opts;
    }

    function configKey(config) {
      if (!config) return null;
      return JSON.stringify({
        type: config.type,
        credential_id: config.credential_id,
        model: config.model,
      });
    }

    function extractDefaults(parameterSchema) {
      const defaults = {};
      if (parameterSchema?.properties) {
        for (const [k, p] of Object.entries(parameterSchema.properties)) {
          if (p.default !== undefined) defaults[k] = p.default;
        }
      }
      return defaults;
    }

    const fallbackOptions = computed(() => flattenOptions(props.modelGroups));
    const fallbackValueKey = computed(() => configKey(props.fallbackModelConfig));

    const ttsOptions = computed(() => flattenOptions(ttsGroups.value));
    const ttsValueKey = computed(() => configKey(props.ttsModelConfig));

    function handleFallbackChange(key) {
      if (!key) {
        emit('fallback-change', null);
        return;
      }
      const opt = fallbackOptions.value.find((o) => o.key === key);
      if (!opt) return;
      emit('fallback-change', {
        type: opt.type,
        credential_id: opt.credential_id,
        model: opt.model,
        parameters: {},
      });
    }

    function handleTTSChange(key) {
      if (!key) {
        emit('tts-change', null);
        return;
      }
      const opt = ttsOptions.value.find((o) => o.key === key);
      if (!opt) return;
      emit('tts-change', {
        type: opt.type,
        credential_id: opt.credential_id,
        model: opt.model,
        parameters: extractDefaults(opt.card?.parameter_schema),
      });
    }

    watch(
      () => props.modelConfig?.model,
      () => {
        values.value = { ...(props.modelConfig?.parameters || {}) };
      },
      { immediate: true },
    );

    function handleChange(key, value) {
      const next = { ...values.value };
      if (value === '' || value === undefined || value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      values.value = next;
      emit('change', next);
    }

    return {
      values,
      entries,
      resolveType,
      handleChange,
      fallbackOptions,
      fallbackValueKey,
      handleFallbackChange,
      ttsOptions,
      ttsValueKey,
      handleTTSChange,
    };
  },
});
</script>
