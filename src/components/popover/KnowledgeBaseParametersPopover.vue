<template>
  <el-popover
    placement="bottom-end"
    width="320"
    trigger="click"
    :disabled="triggerDisabled"
    popper-class="kb-params-popover"
  >
    <div class="flex flex-col gap-3">
      <div>
        <p class="text-sm font-medium text-foreground">知识库参数</p>
        <p class="text-xs text-muted-foreground">配置知识库检索中间件参数</p>
      </div>
      <div v-if="!schema || entries.length === 0" class="text-xs text-muted-foreground">
        无可配置参数
      </div>
      <el-form v-else label-position="top" size="small" class="space-y-2">
        <el-form-item
          v-for="([key, prop]) in entries"
          :key="key"
          :label="prop.title || key.replace(/_/g, ' ')"
          class="mb-2"
        >
          <template v-if="resolve(prop).type === 'boolean'">
            <el-switch
              :value="paramValues[key] !== undefined ? paramValues[key] : prop.default"
              @change="(v) => handleChange(key, v)"
            />
          </template>
          <template v-else-if="resolve(prop).enumValues">
            <el-select
              :value="paramValues[key] !== undefined ? paramValues[key] : ''"
              placeholder="选择"
              class="w-full"
              @change="(v) => handleChange(key, v)"
            >
              <el-option
                v-for="opt in resolve(prop).enumValues"
                :key="String(opt)"
                :label="String(opt)"
                :value="opt"
              />
            </el-select>
          </template>
          <template v-else-if="resolve(prop).type === 'number' || resolve(prop).type === 'integer'">
            <el-input-number
              :value="paramValues[key] !== undefined ? paramValues[key] : undefined"
              :min="prop.minimum"
              :max="prop.maximum"
              :step="resolve(prop).type === 'integer' ? 1 : undefined"
              :controls="false"
              class="w-full"
              @change="(v) => handleChange(key, v)"
            />
          </template>
          <template v-else>
            <el-input
              :value="paramValues[key] !== undefined ? paramValues[key] : ''"
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
      :disabled="triggerDisabled"
      title="知识库参数"
    />
  </el-popover>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@vue/composition-api';

function resolve(prop) {
  if (prop.type && prop.type !== 'null') {
    return { type: prop.type, enumValues: prop.enum ?? null };
  }
  for (const variant of prop.anyOf ?? []) {
    if (variant.type && variant.type !== 'null') {
      return { type: variant.type, enumValues: variant.enum ?? prop.enum ?? null };
    }
  }
  return { type: 'string', enumValues: prop.enum ?? null };
}

export default defineComponent({
  name: 'KnowledgeBaseParametersPopover',
  props: {
    /** { knowledge_base_ids: string[], parameters: Record<string, any> } */
    value: { type: Object, default: null },
    /** 中间件参数 JSON Schema */
    schema: { type: Object, default: null },
    disabled: { type: Boolean, default: false },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const paramValues = ref({});

    const entries = computed(() => Object.entries(props.schema?.properties || {}));
    const hasSelection = computed(() => !!props.value && (props.value.knowledge_base_ids?.length || 0) > 0);
    const triggerDisabled = computed(() => props.disabled || !props.schema || !hasSelection.value);

    watch(
      () => props.value,
      (v) => {
        paramValues.value = { ...(v?.parameters || {}) };
      },
      { immediate: true },
    );

    function handleChange(key, val) {
      const next = { ...paramValues.value };
      if (val === undefined || val === null || val === '') {
        delete next[key];
      } else {
        next[key] = val;
      }
      paramValues.value = next;
      if (!props.value || !props.value.knowledge_base_ids?.length) return;
      emit('change', {
        knowledge_base_ids: props.value.knowledge_base_ids,
        parameters: next,
      });
    }

    return { paramValues, entries, triggerDisabled, resolve, handleChange };
  },
});
</script>
