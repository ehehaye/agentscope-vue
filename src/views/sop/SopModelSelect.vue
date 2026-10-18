<template>
  <el-select
    :value="selectedKey"
    :placeholder="placeholder"
    :loading="loading"
    :clearable="clearable"
    filterable
    class="tw-w-full"
    @change="handleChange"
  >
    <el-option-group
      v-for="group in optionGroups"
      :key="group.label"
      :label="group.label"
    >
      <el-option
        v-for="option in group.models"
        :key="option.key"
        :label="option.label"
        :value="option.key"
      />
    </el-option-group>
  </el-select>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { credentialLabel } from '@/utils/common';

function buildKey(type, credentialId, model) {
  return `${type}|${credentialId}|${model}`;
}

export default defineComponent({
  name: 'SopModelSelect',
  props: {
    value: { type: Object, default: null },
    groups: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    placeholder: { type: String, default: '选择模型' },
    clearable: { type: Boolean, default: false },
  },
  setup(props, { emit }) {
    const optionGroups = computed(() => {
      const groups = [];
      Object.entries(props.groups ?? {}).forEach(([type, entries]) => {
        (entries ?? []).forEach((entry) => {
          const models = (entry.models ?? []).map((model) => ({
            key: buildKey(type, entry.credential.id, model.name),
            type,
            credential_id: entry.credential.id,
            model: model.name,
            label: model.label || model.name,
          }));
          if (models.length > 0) {
            groups.push({
              label: `${type} · ${credentialLabel(entry.credential)}`,
              models,
            });
          }
        });
      });
      return groups;
    });

    const flatOptions = computed(() => optionGroups.value.flatMap((group) => group.models));

    const selectedKey = computed(() => {
      const value = props.value;
      if (!value?.credential_id || !value?.model) return '';
      return buildKey(value.type ?? '', value.credential_id, value.model);
    });

    function handleChange(key) {
      if (!key) {
        emit('change', null);
        return;
      }
      const option = flatOptions.value.find((item) => item.key === key);
      if (!option) return;
      emit('change', {
        type: option.type,
        credential_id: option.credential_id,
        model: option.model,
        parameters: {},
      });
    }

    return { optionGroups, selectedKey, handleChange };
  },
});
</script>
